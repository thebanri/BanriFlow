package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/AlecAivazis/survey/v2"
	"github.com/spf13/cobra"
)

var setCmd = &cobra.Command{
	Use:   "set",
	Short: "Interactive setup for AI Provider and API Keys",
	Run: func(cmd *cobra.Command, args []string) {
		provider := ""
		prompt := &survey.Select{
			Message: "Choose an AI Provider:",
			Options: []string{"gemini", "openai", "openrouter", "anthropic", "claude", "groq"},
		}
		err := survey.AskOne(prompt, &provider)
		if err != nil {
			fmt.Println("Canceled.")
			return
		}

		key := ""
		promptKey := &survey.Password{
			Message: fmt.Sprintf("Enter your %s API Key:", provider),
		}
		err = survey.AskOne(promptKey, &key)
		if err != nil {
			fmt.Println("Canceled.")
			return
		}

		homeDir, _ := os.UserHomeDir()
		envPath := filepath.Join(homeDir, ".banriflow.env")

		envVar := ""
		switch provider {
		case "gemini":
			envVar = "GEMINI_API_KEY"
		case "openai":
			envVar = "OPENAI_API_KEY"
		case "openrouter":
			envVar = "OPENROUTER_API_KEY"
		case "anthropic", "claude":
			envVar = "ANTHROPIC_API_KEY"
			provider = "anthropic" // normalize to anthropic internally
		case "groq":
			envVar = "GROQ_API_KEY"
		}

		content := fmt.Sprintf("%s=%s\nDEFAULT_PROVIDER=%s\n", envVar, key, provider)
		err = os.WriteFile(envPath, []byte(content), 0600)
		if err != nil {
			fmt.Printf("Error saving config: %v\n", err)
			return
		}

		fmt.Printf("✅ Config saved to %s\n", envPath)
		fmt.Printf("Note: The system will automatically use these settings in subsequent runs.\n")
	},
}

func init() {
	rootCmd.AddCommand(setCmd)
}
