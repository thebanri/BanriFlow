package cmd

import (
	"context"
	"fmt"
	"strings"

	"github.com/spf13/cobra"
	"github.com/thebanri/BanriFlow/pkg/analyzer"
	"github.com/thebanri/BanriFlow/pkg/cluster"
)

var liveProvider string
var liveInstruction string

var liveCmd = &cobra.Command{
	Use:   "live",
	Short: "Connect to your local Kubernetes cluster and analyze the live topology",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("🔌 Connecting to live Kubernetes cluster...")
		
		ctx := context.Background()
		liveState, err := cluster.FetchLiveState(ctx)
		if err != nil {
			fmt.Printf("❌ Failed to connect to cluster: %v\n", err)
			return
		}

		if len(liveState) < 100 {
			fmt.Println("⚠️ Connected to cluster, but no Deployments, Services, or Policies found.")
			return
		}

		fmt.Println("✅ Successfully fetched live cluster state. Analyzing topology...")

		res, err := analyzer.AnalyzeLiveTopology(ctx, liveState, liveProvider, liveInstruction)
		if err != nil {
			fmt.Printf("  ⚠️ Live Analysis failed: %v\n", err)
			return
		}

		fmt.Println("\n✅ Live Analysis Complete. Results:")
		if len(res.Issues) == 0 {
			fmt.Println("  🟢 No issues found in the live cluster.")
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
	},
}

func init() {
	liveCmd.Flags().StringVarP(&liveProvider, "provider", "p", "auto", "AI provider to use")
	liveCmd.Flags().StringVarP(&liveInstruction, "ask", "a", "", "Custom instruction for the AI")
	rootCmd.AddCommand(liveCmd)
}
