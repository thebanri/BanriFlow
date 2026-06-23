package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"
)

var openModel string

var openCmd = &cobra.Command{
	Use:   "open",
	Short: "Configure OpenRouter settings",
	Run: func(cmd *cobra.Command, args []string) {
		homeDir, _ := os.UserHomeDir()
		envPath := filepath.Join(homeDir, ".banriflow.env")

		contentBytes, err := os.ReadFile(envPath)
		if err != nil {
			fmt.Println("No configuration found. Please run 'banri set' first.")
			return
		}

		content := string(contentBytes)
		if !strings.Contains(content, "OPENROUTER_API_KEY") {
			fmt.Println("OpenRouter is not configured. Please run 'banri set' and choose openrouter first.")
			return
		}

		if openModel != "" {
			lines := strings.Split(content, "\n")
			found := false
			for i, line := range lines {
				if strings.HasPrefix(line, "OPENROUTER_MODEL=") {
					lines[i] = fmt.Sprintf("OPENROUTER_MODEL=%s", openModel)
					found = true
				}
			}
			if !found {
				// Append if it doesn't exist
				lines = append(lines, fmt.Sprintf("OPENROUTER_MODEL=%s", openModel))
			}

			// Re-join and write back
			newContent := strings.Join(lines, "\n")
			// Clean up extra newlines at end
			newContent = strings.TrimSpace(newContent) + "\n"

			err = os.WriteFile(envPath, []byte(newContent), 0600)
			if err != nil {
				fmt.Printf("Error updating config: %v\n", err)
				return
			}
			fmt.Printf("✅ OpenRouter model successfully updated to: %s\n", openModel)
		} else {
			fmt.Println("Please specify a model using the -m flag. (e.g. banri open -m anthropic/claude-3.5-sonnet)")
		}
	},
}

func init() {
	openCmd.Flags().StringVarP(&openModel, "model", "m", "", "Set the OpenRouter model to use")
	rootCmd.AddCommand(openCmd)
}
