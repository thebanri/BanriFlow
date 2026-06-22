package cmd

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/spf13/cobra"
	"github.com/thebanri/BanriFlow/pkg/analyzer"
	"github.com/thebanri/BanriFlow/pkg/parser"
	"github.com/thebanri/BanriFlow/pkg/scanner"
)

var manualMode bool
var aiProvider string
var topologyMode bool
var customInstruction string

var scanCmd = &cobra.Command{
	Use:   "scan [directory]",
	Short: "Scan a directory for Kubernetes and Terraform files",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		dir := args[0]
		fmt.Printf("Scanning directory: %s\n", dir)
		
		modeStr := "AI-Powered"
		if manualMode {
			modeStr = "Static (Manual)"
		} else if aiProvider != "auto" {
			modeStr = fmt.Sprintf("AI-Powered (%s)", aiProvider)
		}
		if topologyMode {
			modeStr += " [Topology Mode]"
		}
		if customInstruction != "" {
			modeStr += " [Custom Instruction]"
		}
		fmt.Printf("Analysis Mode: %s\n", modeStr)

		files, err := scanner.ScanFiles(dir)
		if err != nil {
			log.Fatalf("Error scanning directory: %v", err)
		}

		if len(files) == 0 {
			fmt.Println("No .yaml, .yml, or .tf files found.")
			return
		}

		ctx := context.Background()

		if topologyMode {
			fmt.Println("\n🧠 Running Holistic Topology Analysis (Cross-Container Communication)...")
			
			var validFiles []string
			for _, file := range files {
				if err := parser.ParseFile(file); err == nil {
					validFiles = append(validFiles, file)
				}
			}

			if len(validFiles) == 0 {
				fmt.Println("No structurally valid files found to analyze topology.")
				return
			}

			res, err := analyzer.AnalyzeTopology(ctx, validFiles, manualMode, aiProvider, customInstruction)
			if err != nil {
				fmt.Printf("  ⚠️ Topology Analysis failed: %v\n", err)
				return
			}

			fmt.Println("\n✅ Analysis Complete. Results:")
			if len(res.Issues) == 0 {
				fmt.Println("  🟢 No topology or communication issues found.")
				return
			}

			for _, issue := range res.Issues {
				var icon string
				switch issue.Type {
				case "cost":
					icon = "💰"
				case "network":
					icon = "🕸️"
				case "architecture":
					icon = "🏛️"
				case "availability":
					icon = "🔁"
				default:
					icon = "🔐"
				}
				fmt.Printf("  %s [%s] %s: %s\n", icon, issue.Severity, strings.ToUpper(issue.Type), issue.Message)
				fmt.Printf("     💡 Fix: %s\n", issue.Recommendation)
			}
			return
		}

		fmt.Println("\nAnalyzing files individually...")
		for _, file := range files {
			err := parser.ParseFile(file)
			if err != nil {
				fmt.Printf("\n❌ %s (Parse Error: %v)\n", file, err)
				continue
			}
			
			fmt.Printf("\n✅ %s (Valid format, analyzing...)\n", file)
			
			res, err := analyzer.Analyze(ctx, file, manualMode, aiProvider, customInstruction)
			if err != nil {
				fmt.Printf("  ⚠️ Analysis failed: %v\n", err)
				continue
			}

			if len(res.Issues) == 0 {
				fmt.Println("  🟢 No issues found.")
				continue
			}

			for _, issue := range res.Issues {
				var icon string
				switch issue.Type {
				case "cost":
					icon = "💰"
				case "network":
					icon = "🕸️"
				case "architecture":
					icon = "🏛️"
				case "availability":
					icon = "🔁"
				default:
					icon = "🔐"
				}
				fmt.Printf("  %s [%s] %s: %s\n", icon, issue.Severity, strings.ToUpper(issue.Type), issue.Message)
				fmt.Printf("     💡 Fix: %s\n", issue.Recommendation)
			}
		}
	},
}

func init() {
	scanCmd.Flags().BoolVarP(&manualMode, "manual", "m", false, "Run in manual (static) mode without AI")
	scanCmd.Flags().StringVarP(&aiProvider, "provider", "p", "auto", "AI provider to use: auto, openai, anthropic, claude, gemini, groq, openrouter")
	scanCmd.Flags().BoolVarP(&topologyMode, "topology", "t", false, "Analyze the architecture as a whole to test inter-container communication")
	scanCmd.Flags().StringVarP(&customInstruction, "ask", "a", "", "Custom instruction for the AI (e.g. 'test security for my kubernetes system')")
	rootCmd.AddCommand(scanCmd)
}
