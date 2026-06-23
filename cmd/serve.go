package cmd

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/spf13/cobra"
	"github.com/thebanri/BanriFlow/pkg/cluster"
	"github.com/thebanri/BanriFlow/pkg/ui"
)

var daemonMode bool
var serveProvider string
var uiUrl string

var serveCmd = &cobra.Command{
	Use:   "serve",
	Short: "Start the REST API and dynamically fetch/serve the UI",
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

		// UI Dynamic Fetch Logic
		homeDir, _ := os.UserHomeDir()
		uiDest := filepath.Join(homeDir, ".kubesight-ui")
		
		// If index.html is missing in the destination, attempt to download it
		if _, err := os.Stat(filepath.Join(uiDest, "index.html")); os.IsNotExist(err) {
			if uiUrl != "" {
				err := ui.FetchAndExtractUI(uiUrl, uiDest)
				if err != nil {
					log.Fatalf("🚨 UI indirilirken kritik hata oluştu: %v", err)
				}
			} else {
				fmt.Println("⚠️ UYARI: Arayüz dosyaları bulunamadı ve --ui-url belirtilmedi. Yalnızca REST API çalışacak.")
			}
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
			child.SysProcAttr = &syscall.SysProcAttr{Setsid: true} 
			
			logPath := filepath.Join(homeDir, ".banriflow.log")
			logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
			if err == nil {
				child.Stdout = logFile
				child.Stderr = logFile
			}
			
			err = child.Start()
			if err != nil {
				log.Fatalf("Arkaplan işlemi başlatılamadı: %v", err)
			}
			fmt.Printf("✅ Sunucu arkaplanda başladı! Görüntülemek için: http://0.0.0.0:3005\n")
			fmt.Printf("📜 Hata analizi ve logları okumak için terminalde şunu çalıştır:\n   tail -f %s\n", logPath)
			os.Exit(0)
		}

		// Start global Kubernetes Event watcher to persist events
		go cluster.StartGlobalEventWatcher(context.Background(), serveProvider)

		// Web Server setup
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

		app.Get("/api/logs/history", func(c *fiber.Ctx) error {
			// Get events from the last 7 days
			events := cluster.GetRecentEvents(7)
			return c.JSON(events)
		})

		app.Get("/api/events", func(c *fiber.Ctx) error {
			c.Set("Content-Type", "text/event-stream")
			c.Set("Cache-Control", "no-cache")
			c.Set("Connection", "keep-alive")
			c.Set("Transfer-Encoding", "chunked")

			c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
				ch := make(chan string)
				cluster.AddClient(ch)
				defer cluster.RemoveClient(ch)

				for {
					msg, ok := <-ch
					if !ok {
						return
					}
					fmt.Fprintf(w, "data: %s\n\n", msg)
					if err := w.Flush(); err != nil {
						return
					}
				}
			})
			return nil
		})

		app.Get("/api/solve/stream", func(c *fiber.Ctx) error {
			ns := c.Query("ns")
			pod := c.Query("pod")
			errMsg := c.Query("err")

			c.Set("Content-Type", "text/event-stream")
			c.Set("Cache-Control", "no-cache")
			c.Set("Connection", "keep-alive")
			c.Set("Transfer-Encoding", "chunked")

			c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
				cluster.AutoFixStream(context.Background(), serveProvider, ns, pod, errMsg, w)
			})
			return nil
		})

		// Serve static UI downloaded from remote
		app.Static("/", uiDest)

		fmt.Println("🚀 KubeSight API \u0026 UI Başladı! Görüntülemek için: http://0.0.0.0:3005")
		fmt.Println("🐛 Debug logları aktif. Gelen bağlantılar aşağıda listelenecek...")
		log.Fatal(app.Listen("0.0.0.0:3005"))
	},
}

func init() {
	serveCmd.Flags().BoolVarP(&daemonMode, "daemon", "d", false, "Sunucuyu arkaplanda (daemon) çalıştırır")
	serveCmd.Flags().StringVarP(&serveProvider, "provider", "p", "auto", "Kullanılacak AI Provider (gemini, openai, vs)")
	serveCmd.Flags().StringVarP(&uiUrl, "ui-url", "u", "", "Uzak UI deposunun .zip indirme bağlantısı (örneğin github release URL'si)")
	rootCmd.AddCommand(serveCmd)
}
