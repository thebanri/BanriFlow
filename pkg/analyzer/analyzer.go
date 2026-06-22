package analyzer

import (
	"context"
)

// Issue represents a discovered vulnerability or cost issue
type Issue struct {
	Severity       string `json:"severity"`
	Type           string `json:"type"` // "security" or "cost"
	Message        string `json:"message"`
	Recommendation string `json:"recommendation"`
}

// Result holds the analysis outcome for a file
type Result struct {
	File   string  `json:"file"`
	Issues []Issue `json:"issues"`
}

// Analyze runs the analysis on a file using either Manual or AI mode
func Analyze(ctx context.Context, filePath string, manualMode bool, provider string, customInstruction string) (*Result, error) {
	if manualMode {
		return RunStaticAnalysis(filePath)
	}
	return RunAIAnalysis(ctx, filePath, provider, customInstruction)
}

// AnalyzeTopology runs a holistic analysis over multiple files to test communication
func AnalyzeTopology(ctx context.Context, filePaths []string, manualMode bool, provider string, customInstruction string) (*Result, error) {
	if manualMode {
		return &Result{
			File: "Aggregate Topology",
			Issues: []Issue{{
				Severity: "Low", Type: "network", Message: "Static topology analysis is not implemented yet. Please use AI mode.", Recommendation: "Disable manual mode to use AI topology analysis.",
			}},
		}, nil
	}
	return RunTopologyAnalysis(ctx, filePaths, provider, customInstruction)
}

// AnalyzeLiveTopology analyzes the live scraped state of a Kubernetes cluster
func AnalyzeLiveTopology(ctx context.Context, liveState string, provider string, customInstruction string) (*Result, error) {
	return RunAnalyzeLiveTopology(ctx, liveState, provider, customInstruction)
}
