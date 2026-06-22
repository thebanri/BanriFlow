package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "banri",
	Short: "BanriFlow: AI-Powered Cloud Security Posture Management",
	Long:  `BanriFlow is an elite CLI tool to analyze Kubernetes and Terraform files for security flaws, cost optimization, and topological analysis.`,
}

// Execute adds all child commands to the root command and sets flags appropriately.
func Execute() {
	homeDir, _ := os.UserHomeDir()
	envPath := filepath.Join(homeDir, ".banriflow.env")
	_ = godotenv.Load(envPath) // ignore error if not exists

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
