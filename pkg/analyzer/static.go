package analyzer

func RunStaticAnalysis(filePath string) (*Result, error) {
	// Placeholder for static analysis logic
	return &Result{
		File: filePath,
		Issues: []Issue{
			{
				Severity:       "Low",
				Type:           "security",
				Message:        "Static analysis placeholder. No real static rules implemented yet.",
				Recommendation: "Implement static rules using checkov/tfsec patterns or wait for AI fallback.",
			},
		},
	}, nil
}
