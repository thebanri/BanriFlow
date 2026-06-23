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

	actualPod := pod
	// Eğer kullanıcı aynı incident üzerinden peş peşe mesaj atıyorsa, önceki mesaj deployment'ı yamalamış ve eski pod silinmiş olabilir.
	// Bu yüzden her çağrıda prefix'ten yola çıkarak en güncel pod'u bulmaya çalışıyoruz.
	parts := strings.Split(pod, "-")
	var prefix string
	if len(parts) >= 3 {
		prefix = strings.Join(parts[:len(parts)-2], "-")
	} else {
		prefix = pod
	}

	findCmd := exec.CommandContext(ctx, "bash", "-c", fmt.Sprintf("kubectl get pods -n %s --no-headers | grep '^%s-' | head -n 1 | awk '{print $1}'", namespace, prefix))
	findOut, err := findCmd.CombinedOutput()
	foundPod := strings.TrimSpace(string(findOut))
	if err == nil && foundPod != "" && foundPod != pod {
		sendMsg(fmt.Sprintf("🔄 KubeSight: Eski pod (%s) artık yok. İşleme güncel pod (%s) üzerinden devam ediliyor.", pod, foundPod))
		actualPod = foundPod
	} else {
		sendMsg(fmt.Sprintf("🔄 Hedef Pod: %s/%s", namespace, actualPod))
	}

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
3. KUBERNETES KURALI: Çalışan bir Pod üzerinde 'kubectl patch pod' veya 'kubectl edit pod' KESİNLİKLE KULLANMA! Bir pod'un 'image' özelliği dışındaki hiçbir alanını (command, resources, env) doğrudan değiştiremezsin (Forbidden hatası verir). Değişiklik yapmak istiyorsan her zaman o Pod'u yöneten DEPLOYMENT'i yamala (patch/set).
   - YANLIŞ: kubectl patch pod ornek-pod-1234 -p ...
   - DOĞRU: kubectl patch deployment ornek -p ... (Deployment adı genellikle Pod adından sondaki 2 hash silinerek bulunur, örn: pod "crash-app-123-456" ise deployment adı "crash-app"tir).
4. ÇÖZÜLEMEYEN VEYA EMİN OLUNAMAYAN SORUNLAR: Eğer sorunu tek bir YAML/patch komutuyla kesin olarak ÇÖZEMEYECEKSEN (örneğin loglara bakman gerekiyorsa veya CrashLoopBackOff/ImagePullBackOff'un tam nedenini bilmiyorsan), kubectl komutları ÇALIŞTIRMA! Bunun yerine kullanıcıya ne yapması gerektiğini söyleyen bir "echo" komutu üret. ASLA 'kubectl logs' veya 'kubectl describe' gibi sadece okuma yapan komutlar üretme, sadece kalıcı olarak çözen komutlar üret veya 'echo' ile tavsiye ver.
5. NAMESPACE ZORUNLULUĞU: Ürettiğin HİÇBİR kubectl komutunda namespace'i unutma! Her komutun sonuna kesinlikle '-n <Namespace>' ekle. (Eğer echo kullanmıyorsan).
6. CONTAINER ADI BİLİNMİYORSA: Eger "kubectl set image" komutu kullanacaksan ve container adını bilmiyorsan, container adı yerine "*" kullanarak tüm container'ları hedefle. (Örn: kubectl set image deployment/ornek-uyg *=yeni-imaj:latest -n namespace)
7. RESOURCE LİMİT GÜNCELLEMESİ: Eğer CPU veya Memory request/limit değerlerini güncelleyeceksen KESİNLİKLE 'kubectl patch' KULLANMA (çünkü container adını bilmiyorsun ve hata verir). Bunun yerine TERCİHEN 'kubectl set resources' kullan. Örn: kubectl set resources deployment/ornek --requests=memory=256Mi -n namespace

Namespace: %s
Pod: %s
Hata: %s`, namespace, actualPod, errMsg)

	// Try to fetch last 20 lines of logs to give AI more context
	logCmd := exec.CommandContext(ctx, "kubectl", "logs", actualPod, "-n", namespace, "--all-containers", "--tail=20")
	logOut, _ := logCmd.CombinedOutput()
	logStr := strings.TrimSpace(string(logOut))
	if len(logStr) > 0 && len(logStr) < 2000 {
		prompt += fmt.Sprintf("\n\nPod Logları (Son 20 Satır):\n%s", logStr)
	} else if len(logStr) >= 2000 {
		prompt += fmt.Sprintf("\n\nPod Logları (Son 20 Satır):\n%s", logStr[:2000]+" ...[TRUNCATED]")
	}

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

		if strings.HasPrefix(cmdStr, "echo") {
			sendMsg("ℹ️ Bu sorun doğrudan çözülemediği için (veya bilgi amaçlı) sadece öneri sunuldu.")
		} else {
			sendMsg("⏳ Değişikliklerin etki etmesi bekleniyor (5 saniye)...")
			time.Sleep(5 * time.Second)
			sendMsg("🔍 Durum doğrulanıyor...")

			checkCmd := exec.CommandContext(ctx, "kubectl", "get", "pod", actualPod, "-n", namespace, "-o", "jsonpath={.status.phase} {.status.containerStatuses[0].state.waiting.reason}")
			statusOut, checkErr := checkCmd.CombinedOutput()
			status := strings.TrimSpace(string(statusOut))

			if checkErr != nil {
				// If pod is deleted or not found, it means the deployment is rolling out a new pod.
				sendMsg("🎉 DOĞRULANDI: Eski pod silindi ve yenisi oluşturuluyor! (Deployment güncellendi)")
				sendMsg("[SOLVED]")
			} else if strings.Contains(status, "CrashLoopBackOff") || strings.Contains(status, "ImagePullBackOff") || strings.Contains(status, "ErrImagePull") {
				sendMsg("⚠️ KISMİ BAŞARI: Komut çalıştı ancak Pod hala hatalı. Mevcut durum: " + status)
			} else if strings.Contains(status, "Running") || strings.Contains(status, "Succeeded") || strings.Contains(status, "Pending") {
				// Pending is fine for now, it means it's starting. Running without CrashLoop is also fine.
				sendMsg("🎉 DOĞRULANDI: Sorun çözüldü veya çözülüyor! Pod durumu: " + status)
				sendMsg("[SOLVED]")
			} else {
				sendMsg("⚠️ DOĞRULAMA BELİRSİZ: Mevcut durum: " + status)
			}
		}
	}
	
	sendMsg("🏁 Süreç tamamlandı.")
	sendMsg("[DONE]")
}
