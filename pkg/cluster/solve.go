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
func AutoFixStream(ctx context.Context, provider, namespace, pod, errMsg, userInput string, w *bufio.Writer) {
	sendMsg := func(text string) {
		fmt.Fprintf(w, "data: %s\n\n", text)
		w.Flush()
	}

	sendMsg(fmt.Sprintf("🔄 Hedef Pod: %s/%s", namespace, pod))
	if userInput != "" {
		sendMsg(fmt.Sprintf("🧑‍💻 Kullanıcı Talimatı İşleniyor: %s", userInput))
	} else {
		sendMsg("🧠 Yapay zeka sorunu analiz ediyor ve çözüm üretiyor...")
	}

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
3. KUBERNETES KURALI: Çalışan bir Pod üzerinde 'kubectl patch pod' veya 'kubectl edit pod' KESİNLİKLE KULLANMA! Bir pod'un 'image' özelliği dışındaki hiçbir alanını (command, resources, env) doğrudan değiştiremezsin (Forbidden hatası verir). Değişiklik yapmak istiyorsan her zaman o Pod'u yöneten DEPLOYMENT'i yamala (patch/set). (Deployment adı genellikle Pod adından sondaki 2 hash silinerek bulunur, örn: pod "crash-app-123-456" ise deployment adı "crash-app"tir).
4. ÇÖZÜLEMEYEN SORUNLAR: Eğer hata "ImagePullBackOff" ise ve sorunun ne olduğundan %100 emin değilsen "echo" komutu üret. FAKAT, eğer imaj adında ÇOK BARİZ bir yazım hatası varsa (örneğin nginxx, ubutnu, rediss) bunu otomatik olarak bilinen public imaj adıyla (nginx, ubuntu, redis) değiştiren bir komut üretebilirsin.
5. CONTAINER ADI BİLİNMİYORSA: Eger "kubectl set image" komutu kullanacaksan ve container adını bilmiyorsan, container adı yerine "*" kullanarak tüm container'ları hedefle. (Örn: kubectl set image deployment/ornek-uyg *=yeni-imaj:latest -n namespace)

Namespace: %s
Pod: %s
Hata: %s`, namespace, pod, errMsg)

	if userInput != "" {
		prompt += fmt.Sprintf("\n\nÖZEL KULLANICI TALİMATI: %s\nYukarıdaki hatayı çözerken bu kullanıcının verdiği kesin talimatı HARFİYEN uygula! Kullanıcı bir imaj adı verirse Deployment veya ReplicaSet'i set image ile doğrudan değiştir.", userInput)
	}

	prompt += "\n\nSadece kesin emin olduğun ve hatasız çalışacak bir BASH komutu üret."

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

		sendMsg("⏳ Değişikliklerin etki etmesi bekleniyor (5 saniye)...")
		time.Sleep(5 * time.Second)
		sendMsg("🔍 Durum doğrulanıyor...")

		checkCmd := exec.CommandContext(ctx, "kubectl", "get", "pod", pod, "-n", namespace, "-o", "jsonpath={.status.phase}")
		statusOut, checkErr := checkCmd.CombinedOutput()
		status := strings.TrimSpace(string(statusOut))

		if checkErr == nil && (status == "Running" || status == "Succeeded") {
			sendMsg("🎉 DOĞRULANDI: Sorun çözüldü! Pod durumu: " + status)
			sendMsg("[SOLVED]")
		} else if checkErr == nil {
			sendMsg("⚠️ KISMİ BAŞARI: Komut çalıştı ancak Pod henüz tam iyileşmedi. Mevcut durum: " + status)
		} else {
			sendMsg("⚠️ DOĞRULAMA BAŞARISIZ: Pod durumu alınamadı (belki yeniden oluşturuluyor veya silindi).")
		}
	}
	
	sendMsg("🏁 Süreç tamamlandı.")
	sendMsg("[DONE]")
}
