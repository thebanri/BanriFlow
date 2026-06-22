package cmd

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/spf13/cobra"
	"github.com/thebanri/BanriFlow/pkg/cluster"
)

var daemonMode bool
var serveProvider string

var serveCmd = &cobra.Command{
	Use:   "serve",
	Short: "Start the BanriFlow REST API and 3D GUI Dashboard",
	Run: func(cmd *cobra.Command, args []string) {
		// 1. Mandatory AI Check
		provider := serveProvider
		if provider == "auto" {
			provider = os.Getenv("AI_PROVIDER")
			if provider == "" {
				provider = "gemini"
			}
		}

		var apiKey string
		switch strings.ToLower(provider) {
		case "openai":
			apiKey = os.Getenv("OPENAI_API_KEY")
		case "anthropic", "claude":
			apiKey = os.Getenv("ANTHROPIC_API_KEY")
		case "groq":
			apiKey = os.Getenv("GROQ_API_KEY")
		case "openrouter":
			apiKey = os.Getenv("OPENROUTER_API_KEY")
		default: // gemini
			apiKey = os.Getenv("GEMINI_API_KEY")
		}

		if apiKey == "" {
			log.Fatalf("🚨 HATA: Yapay Zeka parametresi ZORUNLUDUR! Lütfen 'banri set' komutu ile bir API Key ayarlayın veya ilgili ortam değişkenini girin.")
		}

		// 2. Daemon Mode Fork
		if daemonMode {
			executable, err := os.Executable()
			if err != nil {
				log.Fatalf("Çalıştırılabilir dosya bulunamadı: %v", err)
			}
			
			childArgs := []string{"serve"}
			if serveProvider != "auto" {
				childArgs = append(childArgs, "-p", serveProvider)
			}
			
			child := exec.Command(executable, childArgs...)
			err = child.Start()
			if err != nil {
				log.Fatalf("Arkaplan işlemi başlatılamadı: %v", err)
			}
			fmt.Println("✅ BanriFlow arkaplanda başladı! Görüntülemek için: http://localhost:3005")
			os.Exit(0)
		}

		// 3. Web Server setup
		app := fiber.New(fiber.Config{
			DisableStartupMessage: true,
		})

		app.Use(cors.New())
		app.Use(logger.New())

		app.Get("/api/topology", func(c *fiber.Ctx) error {
			data, err := cluster.FetchGraphData(c.Context())
			if err != nil {
				return c.Status(500).JSON(fiber.Map{"error": err.Error()})
			}
			return c.JSON(data)
		})

		app.Get("/", func(c *fiber.Ctx) error {
			c.Set("Content-Type", "text/html")
			return c.SendString(htmlContent)
		})

		fmt.Println("🚀 BanriFlow 3D GUI Başladı! Görüntülemek için: http://localhost:3005")
		fmt.Println("🐛 Debug logları aktif. Gelen bağlantılar aşağıda listelenecek...")
		log.Fatal(app.Listen(":3005"))
	},
}

func init() {
	serveCmd.Flags().BoolVarP(&daemonMode, "daemon", "d", false, "Sunucuyu arkaplanda (daemon) çalıştırır")
	serveCmd.Flags().StringVarP(&serveProvider, "provider", "p", "auto", "Kullanılacak AI Provider (gemini, openai, vs)")
	rootCmd.AddCommand(serveCmd)
}

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>BanriFlow - 3D Live Topology</title>
  <script src="https://unpkg.com/3d-force-graph"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body { margin: 0; padding: 0; background-color: #0f172a; font-family: 'Inter', sans-serif; overflow: hidden; color: white; }
    #graph { width: 100vw; height: 100vh; }
    
    .glass-panel {
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 16px 24px;
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
    }

    h1 { margin: 0; font-size: 24px; font-weight: 700; background: linear-gradient(to right, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

    /* Side Panel */
    .side-panel {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 380px;
      height: auto;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      background: rgba(30, 41, 59, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 24px;
      transform: translateX(120%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .side-panel.open { transform: translateX(0); }
    .side-panel h2 { margin-top: 0; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); word-break: break-all; font-size: 20px;}
    .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;}
    .metric { padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);}
    .metric strong { color: #94a3b8; display: block; font-size: 12px; margin-bottom: 4px; }
    .metric span { font-weight: 600; font-size: 16px; display: block;}
    .error-text { color: #ef4444; }
    
    .ai-box { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); padding: 16px; border-radius: 12px; font-size: 14px; line-height: 1.5; color: #cbd5e1;}
    .ai-box.danger { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); }
    .ai-box strong { color: white; display: block; margin-bottom: 8px; font-size: 16px; }

    .close-btn { position: absolute; top: 16px; right: 16px; background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 18px; padding: 4px; }
    .close-btn:hover { color: white; }
  </style>
</head>
<body>
  <div class="glass-panel" style="z-index: 10;">
    <h1>BanriFlow 3D</h1>
  </div>
  
  <div id="side-panel" class="side-panel" style="z-index: 10;">
    <button class="close-btn" onclick="closePanel()">✕</button>
    <h2 id="sp-name">Node</h2>
    
    <div class="metrics-grid">
      <div class="metric"><strong>TÜR</strong><span id="sp-group"></span></div>
      <div class="metric"><strong>DURUM</strong><span id="sp-status"></span></div>
      <div class="metric"><strong>IP ADRESİ</strong><span id="sp-ip"></span></div>
      <div class="metric"><strong>RESTART</strong><span id="sp-restarts"></span></div>
      <div class="metric"><strong>CPU REQ</strong><span id="sp-cpu"></span></div>
      <div class="metric"><strong>MEM REQ</strong><span id="sp-mem"></span></div>
    </div>

    <div id="sp-ai" class="ai-box">
      <strong>AI Güvenlik & Stabilite Analizi</strong>
      <span id="sp-ai-text"></span>
      <br><br>
      <small style="color: #94a3b8" id="sp-details"></small>
    </div>
  </div>

  <div id="graph"></div>

  <script>
    const panel = document.getElementById('side-panel');
    function closePanel() { panel.classList.remove('open'); }

    fetch('/api/topology').then(res => res.json()).then(data => {
      const Graph = ForceGraph3D()
        (document.getElementById('graph'))
        .graphData(data)
        .nodeLabel(node => {
          return '<div style="background: rgba(30, 41, 59, 0.9); backdrop-filter: blur(8px); padding: 8px 12px; border-radius: 8px; font-family: Inter; border: 1px solid rgba(255,255,255,0.1);">' +
                 '<strong>' + node.name + '</strong><br>' +
                 '<span style="color:#94a3b8;font-size:12px;">Type: ' + node.group.toUpperCase() + '</span><br>' +
                 'Status: <span style="color:' + (node.status === "error" ? "#ef4444" : "#34d399") + ';font-weight:600;">' + (node.status === "error" ? "CRITICAL" : "HEALTHY") + '</span>' +
                 '</div>';
        })
        .nodeColor(node => {
          if (node.status === 'error') return '#ef4444'; // Red
          if (node.group === 'service') return '#8b5cf6'; // Purple
          return '#3b82f6'; // Blue
        })
        .nodeRelSize(6)
        .linkColor(link => link.status === 'blocked' ? '#ef4444' : 'rgba(255,255,255,0.2)')
        .linkDirectionalArrowLength(3.5)
        .linkDirectionalArrowRelPos(1)
        .onNodeClick(node => {
          // Camera aim
          const distance = 40;
          const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
          Graph.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
            node, 
            2000
          );
          
          // Update Sidebar
          document.getElementById('sp-name').innerText = node.name;
          document.getElementById('sp-group').innerText = node.group.toUpperCase();
          document.getElementById('sp-ip').innerText = node.ip || 'Yok';
          document.getElementById('sp-restarts').innerText = node.restarts;
          document.getElementById('sp-cpu').innerText = node.cpu || 'N/A';
          document.getElementById('sp-mem').innerText = node.memory || 'N/A';
          
          const statusEl = document.getElementById('sp-status');
          statusEl.innerText = node.status === 'error' ? 'CRITICAL' : 'HEALTHY';
          statusEl.className = node.status === 'error' ? 'error-text' : '';

          document.getElementById('sp-details').innerText = node.details || '';
          
          const aiBox = document.getElementById('sp-ai');
          const aiText = document.getElementById('sp-ai-text');
          if (node.status === 'error') {
            aiBox.className = 'ai-box danger';
            aiText.innerHTML = "<strong>CrashLoopBackOff Tespit Edildi!</strong> Bu container " + node.restarts + " kez çöktü.<br><br><em>Öneri:</em> Liveness/Readiness probe'larını kontrol et, ortam değişkenlerini (ENV) doğrula ve imaj entrypoint'inin FATAL hatası fırlatmadığından emin ol. Detaylı analiz için terminalden <code>kubectl logs " + node.name + "</code> komutunu çalıştır.";
          } else {
            aiBox.className = 'ai-box';
            aiText.innerHTML = "Kritik bir stabilite sorunu tespit edilmedi. Topoloji standart görünüyor. Bu " + node.group + " için NetworkPolicy kurallarının doğru izole edildiğinden emin ol.";
          }
          
          panel.classList.add('open');
        });
    }).catch(err => {
      document.body.innerHTML = '<h2 style="padding:40px; text-align:center;">Cluster bağlantısı başarısız oldu. API arka planda çalışıyor mu? Hata: ' + err + '</h2>';
    });
  </script>
</body>
</html>`
