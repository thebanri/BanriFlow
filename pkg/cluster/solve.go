package cluster

import (
	"bufio"
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"github.com/thebanri/BanriFlow/pkg/analyzer"
	"github.com/tmc/langchaingo/llms"
)

// AutoFixStream takes the K8s error, asks the AI for a fixing bash command, executes it, and streams the process.
func AutoFixStream(ctx context.Context, provider, namespace, pod, errMsg string, w *bufio.Writer) {
	sendMsg := func(text string) {
		fmt.Fprintf(w, "data: %s\n\n", text)
		w.Flush()
	}

	sendMsg(fmt.Sprintf("🔄 Hedef Pod: %s/%s", namespace, pod))
	sendMsg("🧠 Yapay zeka sorunu analiz ediyor ve çözüm üretiyor...")

	llm, err := analyzer.GetLLM(ctx, provider)
	if err != nil {
		sendMsg(fmt.Sprintf("❌ Hata: AI modeli yüklenemedi: %v", err))
		return
	}

	prompt := fmt.Sprintf(`Sen bir Kubernetes otomatik onarım asistanısın.
Aşağıdaki hatayı çözmek için ÇALIŞTIRILACAK TEK BİR BASH/KUBECTL KOMUTU üret.
SADECE KOMUTU YAZ! (Markdown backtick kullanma, sadece saf komut)

ÇOK ÖNEMLİ KURALLAR:
1. KESİNLİKLE "<" veya ">" gibi Bash yönlendirme operatörlerini (yer tutucu olarak bile olsa) KULLANMA! (Örn: <KULLANICI_ADI> YAZMA, yerine dummy-user yaz).
2. Tırnak işaretlerini (", ') doğru ve güvenli kullan.
3. KUBERNETES KURALI: Çalışan bir Pod'un container listesini "kubectl patch pod" ile doğrudan güncelleyemezsin (Forbidden hatası verir). Pod'lar genelde Deployment vb. tarafından yönetilir.
4. ÇÖZÜLEMEYEN SORUNLAR: Eğer hata "ImagePullBackOff" gibi senin doğrudan çözemeyeceğin (doğru imaj adını veya şifreyi bilmediğin) bir durumsa, "kubectl" ile sistemi bozmaya çalışmak YERİNE, kullanıcıya ne yapması gerektiğini söyleyen bir "echo" komutu üret.
Örnek: echo "İmaj bulunamadı veya yetkiniz yok. Lütfen doğru imaj etiketini kontrol edin veya 'kubectl create secret docker-registry' ile kimlik bilgisi ekleyip Deployment'ı güncelleyin."

Namespace: %s
Pod: %s
Hata: %s

Sadece kesin emin olduğun ve hatasız çalışacak bir BASH komutu üret.`, namespace, pod, errMsg)

	completion, err := llms.GenerateFromSinglePrompt(ctx, llm, prompt, llms.WithTemperature(0.1))
	if err != nil {
		sendMsg(fmt.Sprintf("❌ Hata: AI çözüm üretemedi: %v", err))
		return
	}

	cmdStr := strings.TrimSpace(completion)
	cmdStr = strings.ReplaceAll(cmdStr, "```bash", "")
	cmdStr = strings.ReplaceAll(cmdStr, "```", "")
	cmdStr = strings.TrimSpace(cmdStr)

	if cmdStr == "" {
		sendMsg("❌ AI herhangi bir komut önermedi.")
		return
	}

	sendMsg(fmt.Sprintf("⚙️ Çalıştırılan Komut: %s", cmdStr))
	time.Sleep(1 * time.Second) // Küçük bir bekleme efekti

	cmd := exec.CommandContext(ctx, "bash", "-c", cmdStr)
	out, err := cmd.CombinedOutput()

	if err != nil {
		sendMsg(fmt.Sprintf("⚠️ Komut başarısız oldu: %v", err))
		if len(out) > 0 {
			sendMsg(fmt.Sprintf("Çıktı: %s", string(out)))
		}
	} else {
		sendMsg("✅ Komut başarıyla uygulandı!")
		if len(out) > 0 {
			sendMsg(fmt.Sprintf("Çıktı: %s", string(out)))
		}
	}
	
	sendMsg("🏁 Süreç tamamlandı.")
}
