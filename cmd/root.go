package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "banriflow",
	Short: "BanriFlow analyzes Kubernetes and Terraform files for security and cost optimizations",
	Long: `BanriFlow is an AI-powered security and cost optimization tool.
It scans Kubernetes (.yaml/.yml) and Terraform (.tf) files.`,
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
