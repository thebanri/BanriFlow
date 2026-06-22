package analyzer

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/anthropic"
	"github.com/tmc/langchaingo/llms/openai"
)

const systemPrompt = `You are an Elite Cloud Architect, Principal DevOps Engineer, and Senior Cybersecurity Auditor.
Your task is to conduct a deep, comprehensive analysis of the provided infrastructure code (Kubernetes YAML, Terraform AWS/GCP/Azure configs).

You MUST identify ANY missing components, security flaws, cost inefficiencies, or architectural anti-patterns.
Focus on:
1. Cloud Infrastructure (Terraform): Public S3 buckets, unencrypted RDS, 0.0.0.0/0 Security Groups, overly permissive IAM, missing KMS.
2. Kubernetes: Pods running as root, missing resource limits, missing probes, insecure RBAC.
3. Resiliency & High Availability: Single points of failure, missing replicas.
4. Secrets Management: Hardcoded secrets.
5. Language Adaptability: Respond in the EXACT language used in the User Custom Instruction. If the user asks in Turkish, write your message and recommendation in Turkish. If no custom instruction is provided, default to English. The JSON keys MUST remain in English.

CRITICAL INSTRUCTION: You MUST think step-by-step. Fill the "thought_process" field with your detailed reasoning BEFORE providing the final severity, type, message, and recommendation.

Respond ONLY with a valid JSON array of objects. Do not include markdown formatting like "\x60\x60\x60json".

JSON format:
[
  {
    "thought_process": "Your step-by-step reasoning about why this is an issue...",
    "severity": "Critical|High|Medium|Low|Info",
    "type": "security|cost|network|architecture|availability",
    "message": "Specific issue description (in the user's language)",
    "recommendation": "Exact fix (in the user's language)"
  }
]
`

func getLLM(ctx context.Context, provider string) (llms.Model, error) {
	if provider == "auto" {
		if def := os.Getenv("DEFAULT_PROVIDER"); def != "" {
			provider = def
		}
	}

	if provider == "openai" || (provider == "auto" && os.Getenv("OPENAI_API_KEY") != "") {
		return openai.New()
	}
	if provider == "anthropic" || provider == "claude" || (provider == "auto" && os.Getenv("ANTHROPIC_API_KEY") != "") {
		return anthropic.New()
	}
	if provider == "groq" || (provider == "auto" && os.Getenv("GROQ_API_KEY") != "") {
		return openai.New(
			openai.WithToken(os.Getenv("GROQ_API_KEY")),
			openai.WithBaseURL("https://api.groq.com/openai/v1"),
			openai.WithModel("llama3-70b-8192"), // Default Groq model
		)
	}
	if provider == "openrouter" || (provider == "auto" && os.Getenv("OPENROUTER_API_KEY") != "") {
		return openai.New(
			openai.WithToken(os.Getenv("OPENROUTER_API_KEY")),
			openai.WithBaseURL("https://openrouter.ai/api/v1"),
			openai.WithModel("google/gemini-2.5-flash"),
		)
	}
	if provider == "gemini" || (provider == "auto" && os.Getenv("GEMINI_API_KEY") != "") {
		return openai.New(
			openai.WithToken(os.Getenv("GEMINI_API_KEY")),
			openai.WithBaseURL("https://generativelanguage.googleapis.com/v1beta/openai/"),
			openai.WithModel("gemini-2.5-flash"), // Default Gemini model
		)
	}
	return nil, fmt.Errorf("no suitable AI API key found in environment or unsupported provider")
}

func RunAIAnalysis(ctx context.Context, filePath string, provider string, customInstruction string) (*Result, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("read error: %w", err)
	}

	llm, err := getLLM(ctx, provider)
	if err != nil {
		return nil, err
	}

	instructionBlock := ""
	if customInstruction != "" {
		instructionBlock = fmt.Sprintf("\nUser Custom Instruction: \"%s\"\n(IMPORTANT: Evaluate based on this instruction and respond in the same language.)\n", customInstruction)
	}

	prompt := fmt.Sprintf("%s\n%s\nAnalyze the following file:\n%s\n", systemPrompt, instructionBlock, string(content))

	completion, err := llms.GenerateFromSinglePrompt(ctx, llm, prompt,
		llms.WithTemperature(0.1),
		llms.WithTopP(0.7),
		llms.WithMaxTokens(8192),
	)
	if err != nil {
		return nil, fmt.Errorf("AI generation failed: %w", err)
	}

	var issues []Issue
	
	// Clean up potential markdown formatting from completion
	cleanJson := strings.TrimPrefix(completion, "```json")
	cleanJson = strings.TrimPrefix(cleanJson, "```")
	cleanJson = strings.TrimSuffix(cleanJson, "```")
	cleanJson = strings.TrimSpace(cleanJson)

	err = json.Unmarshal([]byte(cleanJson), &issues)
	if err != nil {
		return nil, fmt.Errorf("failed to parse AI response as JSON: %w\nResponse was: %s", err, completion)
	}

	return &Result{
		File:   filePath,
		Issues: issues,
	}, nil
}

func RunTopologyAnalysis(ctx context.Context, filePaths []string, provider string, customInstruction string) (*Result, error) {
	var allContent strings.Builder
	for _, fp := range filePaths {
		content, err := os.ReadFile(fp)
		if err != nil {
			continue
		}
		allContent.WriteString(fmt.Sprintf("--- File: %s ---\n%s\n\n", fp, string(content)))
	}

	llm, err := getLLM(ctx, provider)
	if err != nil {
		return nil, err
	}

	topologyPrompt := `You are an Elite Cloud Architect, Principal DevOps Engineer, and Senior Cybersecurity Auditor.
Your task is to conduct a massive, comprehensive analysis of the ENTIRE provided infrastructure architecture.
These files encompass Kubernetes clusters, Terraform definitions (AWS, GCP, Azure, etc.), and overall cloud topology.

You MUST analyze the architecture as a WHOLE and identify ANY missing components, security flaws, cost inefficiencies, or architectural anti-patterns.
Checklist for your analysis:
1. **Cloud Infrastructure (Terraform/AWS)**: Are AWS S3 buckets public? Are RDS databases unencrypted? Are AWS Security Groups or VPCs misconfigured? Are IAM roles overly permissive? Are instances sized appropriately?
2. **Kubernetes Architecture**: Are pods running as root? Are resource requests/limits missing? Are liveness/readiness probes missing? Is RBAC configured correctly?
3. **Cross-Service Topology & Network**: Can unintended services communicate? Are NetworkPolicies strictly isolating databases? Does the Terraform VPC/Subnet structure securely house the Kubernetes nodes?
4. **Resiliency & High Availability**: Are there single points of failure? Are replicas set to 1 for critical services? Are availability zones utilized?
5. **Secrets Management**: Are secrets hardcoded anywhere in TF or YAML?
6. **Language Adaptability**: Respond in the EXACT language used in the User Custom Instruction. If the user asks in Turkish, write your message and recommendation in Turkish. If no custom instruction is provided, default to English. The JSON keys MUST remain in English.

CRITICAL INSTRUCTION: You MUST think step-by-step. Fill the "thought_process" field with your detailed reasoning BEFORE providing the final severity, type, message, and recommendation. This dramatically improves accuracy.

Provide a deep, holistic audit of ALL missing or flawed configurations in the entire project.
ONLY report issues you are absolutely sure about based on the provided aggregate code.
Respond ONLY with a valid JSON array of objects. Do not include markdown formatting like "\x60\x60\x60json".

JSON format:
[
  {
    "thought_process": "Your step-by-step reasoning... (e.g. 'I see frontend has no NetworkPolicy... therefore... ')",
    "severity": "Critical|High|Medium|Low|Info",
    "type": "security|cost|network|architecture|availability",
    "message": "Deep architectural or specific issue description (in the user's language)",
    "recommendation": "Exact fix or missing component to add (in the user's language)"
  }
]
`

	instructionBlock := ""
	if customInstruction != "" {
		instructionBlock = fmt.Sprintf("\nUser Custom Instruction: \"%s\"\n(IMPORTANT: Evaluate based on this instruction and respond in the same language.)\n", customInstruction)
	}

	prompt := fmt.Sprintf("%s\n%s\nArchitecture Files:\n%s\n", topologyPrompt, instructionBlock, allContent.String())

	completion, err := llms.GenerateFromSinglePrompt(ctx, llm, prompt,
		llms.WithTemperature(0.1),
		llms.WithTopP(0.7),
		llms.WithMaxTokens(8192),
	)
	if err != nil {
		return nil, fmt.Errorf("AI generation failed: %w", err)
	}

	var issues []Issue
	cleanJson := strings.TrimPrefix(completion, "```json")
	cleanJson = strings.TrimPrefix(cleanJson, "```")
	cleanJson = strings.TrimSuffix(cleanJson, "```")
	cleanJson = strings.TrimSpace(cleanJson)

	err = json.Unmarshal([]byte(cleanJson), &issues)
	if err != nil {
		return nil, fmt.Errorf("failed to parse AI response as JSON: %w\nResponse was: %s", err, completion)
	}

	return &Result{
		File:   "Aggregate Topology (All Files)",
		Issues: issues,
	}, nil
}

func RunAnalyzeLiveTopology(ctx context.Context, liveState string, provider string, customInstruction string) (*Result, error) {
	llm, err := getLLM(ctx, provider)
	if err != nil {
		return nil, err
	}

	topologyPrompt := `You are an Elite Cloud Architect, Principal DevOps Engineer, and Senior Cybersecurity Auditor.
Your task is to conduct a massive, comprehensive analysis of the ENTIRE LIVE KUBERNETES CLUSTER.
These configurations were scraped directly from the running cluster.

You MUST analyze the architecture as a WHOLE and identify ANY missing components, security flaws, cost inefficiencies, or architectural anti-patterns.
Checklist for your analysis:
1. **Kubernetes Architecture**: Are live pods running as root? Are resource requests/limits missing in the active deployments? Are liveness/readiness probes missing?
2. **Cross-Service Topology & Network**: Can unintended services communicate? Are NetworkPolicies strictly isolating databases? Are there missing NetworkPolicies?
3. **Resiliency & High Availability**: Are there single points of failure? Are replicas set to 1 for critical services?
4. **Secrets Management**: Are secrets hardcoded anywhere?
5. **Language Adaptability**: Respond in the EXACT language used in the User Custom Instruction. If the user asks in Turkish, write your message and recommendation in Turkish. If no custom instruction is provided, default to English. The JSON keys MUST remain in English.

CRITICAL INSTRUCTION: You MUST think step-by-step. Fill the "thought_process" field with your detailed reasoning BEFORE providing the final severity, type, message, and recommendation. This dramatically improves accuracy.

Provide a deep, holistic audit of ALL missing or flawed configurations in the live cluster.
ONLY report issues you are absolutely sure about based on the provided aggregate code.
Respond ONLY with a valid JSON array of objects. Do not include markdown formatting like "\x60\x60\x60json".

JSON format:
[
  {
    "thought_process": "Your step-by-step reasoning...",
    "severity": "Critical|High|Medium|Low|Info",
    "type": "security|cost|network|architecture|availability",
    "message": "Deep architectural or specific issue description (in the user's language)",
    "recommendation": "Exact fix or missing component to add (in the user's language)"
  }
]
`

	instructionBlock := ""
	if customInstruction != "" {
		instructionBlock = fmt.Sprintf("\nUser Custom Instruction: \"%s\"\n(IMPORTANT: Evaluate based on this instruction and respond in the same language.)\n", customInstruction)
	}

	prompt := fmt.Sprintf("%s\n%s\nLIVE CLUSTER STATE:\n%s\n", topologyPrompt, instructionBlock, liveState)

	completion, err := llms.GenerateFromSinglePrompt(ctx, llm, prompt,
		llms.WithTemperature(0.1),
		llms.WithTopP(0.7),
		llms.WithMaxTokens(8192),
	)
	if err != nil {
		return nil, fmt.Errorf("AI generation failed: %w", err)
	}

	var issues []Issue
	cleanJson := strings.TrimPrefix(completion, "```json")
	cleanJson = strings.TrimPrefix(cleanJson, "```")
	cleanJson = strings.TrimSuffix(cleanJson, "```")
	cleanJson = strings.TrimSpace(cleanJson)

	err = json.Unmarshal([]byte(cleanJson), &issues)
	if err != nil {
		return nil, fmt.Errorf("failed to parse AI response as JSON: %w\nResponse was: %s", err, completion)
	}

	return &Result{
		File:   "Live Cluster Topology",
		Issues: issues,
	}, nil
}
