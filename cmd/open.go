package cmd

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/AlecAivazis/survey/v2"
	"github.com/spf13/cobra"
)

var openModel string

type ORModel struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type ORResponse struct {
	Data []ORModel `json:"data"`
}

// FetchOpenRouterModels retrieves all available models from OpenRouter API
func FetchOpenRouterModels() ([]string, error) {
	resp, err := http.Get("https://openrouter.ai/api/v1/models")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var orResp ORResponse
	if err := json.NewDecoder(resp.Body).Decode(&orResp); err != nil {
		return nil, err
	}

	var options []string
	for _, m := range orResp.Data {
		options = append(options, fmt.Sprintf("%s | %s", m.ID, m.Name))
	}
	sort.Strings(options)
	return options, nil
}

func updateOpenRouterModelInConfig(envPath, modelID string) error {
	contentBytes, err := os.ReadFile(envPath)
	if err != nil {
		return err
	}
	content := string(contentBytes)

	lines := strings.Split(content, "\n")
	found := false
	for i, line := range lines {
		if strings.HasPrefix(line, "OPENROUTER_MODEL=") {
			lines[i] = fmt.Sprintf("OPENROUTER_MODEL=%s", modelID)
			found = true
		}
	}
	if !found {
		lines = append(lines, fmt.Sprintf("OPENROUTER_MODEL=%s", modelID))
	}

	newContent := strings.TrimSpace(strings.Join(lines, "\n")) + "\n"
	return os.WriteFile(envPath, []byte(newContent), 0600)
}

var openCmd = &cobra.Command{
	Use:   "open",
	Short: "Configure OpenRouter settings interactively",
	Run: func(cmd *cobra.Command, args []string) {
		homeDir, _ := os.UserHomeDir()
		envPath := filepath.Join(homeDir, ".banriflow.env")

		contentBytes, err := os.ReadFile(envPath)
		if err != nil {
			fmt.Println("No configuration found. Please run 'banri set' first.")
			return
		}

		if !strings.Contains(string(contentBytes), "OPENROUTER_API_KEY") {
			fmt.Println("OpenRouter is not configured. Please run 'banri set' and choose openrouter first.")
			return
		}

		if openModel == "" {
			fmt.Println("Fetching OpenRouter models from API (this may take a few seconds)...")
			options, err := FetchOpenRouterModels()
			if err != nil {
				fmt.Printf("Error fetching models: %v\n", err)
				return
			}

			selected := ""
			prompt := &survey.Select{
				Message:  "Search and select an OpenRouter Model:",
				Options:  options,
				PageSize: 15,
			}
			if err := survey.AskOne(prompt, &selected); err != nil {
				fmt.Println("Canceled.")
				return
			}

			parts := strings.SplitN(selected, " | ", 2)
			openModel = parts[0]
		}

		err = updateOpenRouterModelInConfig(envPath, openModel)
		if err != nil {
			fmt.Printf("Error updating config: %v\n", err)
			return
		}
		fmt.Printf("✅ OpenRouter model successfully updated to: %s\n", openModel)
	},
}

func init() {
	openCmd.Flags().StringVarP(&openModel, "model", "m", "", "Set the OpenRouter model directly without interactive search")
	rootCmd.AddCommand(openCmd)
}
