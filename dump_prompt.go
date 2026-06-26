//go:build ignore

package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func main() {
	ctx := context.Background()
	namespace := "test-ai-ops"
	actualPod := "crash-app-798598f89b-xnkg2"
	errMsg := "Pod içindeki busybox konteyneri sürekli olarak çöküyor... Çözüm: Pod'un loglarını (kubectl logs) kontrol edin."

	prompt := fmt.Sprintf(`You are a Kubernetes Automated Repair Assistant.
Your task is to produce EXACTLY ONE BASH/KUBECTL COMMAND to fix the given Kubernetes error.
OUTPUT ONLY THE COMMAND. Do not use markdown backticks, explanations, or any other text. JUST the raw command.

CRITICAL RULES:
1. NEVER use bash redirection operators like "<" or ">" (even as placeholders). Use dummy values if needed (e.g. dummy-user instead of <USER>).
2. NEVER use 'kubectl patch pod' or 'kubectl edit pod' on a running Pod! You cannot modify anything other than the 'image' on a live pod. To change commands, resources, or env vars, YOU MUST PATCH THE PARENT DEPLOYMENT.
   - WRONG: kubectl patch pod my-pod-1234 -p ...
   - CORRECT: kubectl patch deployment my-deployment -p ... (You can usually find the deployment name by stripping the last two hash suffixes from the pod name).
3. UNSOLVABLE OR UNKNOWN ISSUES: If you are NOT 100%% sure how to fix the issue with a single patch/set command, DO NOT try to guess. Instead, output an 'echo' command advising the user what to check. 
   - NEVER output read-only commands like 'kubectl logs' or 'kubectl describe' as your final command!
   - ONLY output permanent fix commands (patch, set, apply) OR an 'echo' command with advice.
4. NAMESPACE REQUIREMENT: You MUST append '-n <Namespace>' to every kubectl command you generate.
5. CONTAINER NAME UNKNOWN: If you use 'kubectl set image' but don't know the exact container name, use '*' to target all containers. (e.g., kubectl set image deployment/app *=nginx:latest -n ns)
6. RESOURCE UPDATES: If you need to update CPU/Memory limits or requests, DO NOT use 'kubectl patch' because you might not know the exact container name, which will cause an error. Instead, ALWAYS use 'kubectl set resources'. (e.g., kubectl set resources deployment/app --requests=memory=256Mi -n ns)
7. FIXING COMMAND ERRORS: If the logs show a command error (e.g. "invalid time interval"), you CAN and SHOULD fix it by patching the deployment command directly. Example: kubectl patch deployment <name> -n <ns> --type='json' -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/command", "value": ["nginx", "-g", "daemon off;"]}]'
8. NO BAND-AID FIXES: DO NOT attempt to "fix" an application crash by simply replacing the container's command with arbitrary sleeping commands or endless loops. You MUST attempt to fix the root cause of the crash (e.g. patching volume mounts, securityContext, dnsPolicy, etc.). If you cannot determine the root cause, output an 'echo' command advising the user, do NOT put the container to sleep!

Namespace: %s
Pod: %s
Error: %s`, namespace, actualPod, errMsg)

	cmdArgsCmd := exec.CommandContext(ctx, "kubectl", "get", "pod", actualPod, "-n", namespace, "-o", "jsonpath={range .spec.containers[*]}Container: {.name}\\nCommand: {.command}\\nArgs: {.args}\\n---\\n{end}")
	cmdArgsOut, _ := cmdArgsCmd.CombinedOutput()
	cmdArgsStr := strings.TrimSpace(string(cmdArgsOut))
	if len(cmdArgsStr) > 0 {
		prompt += fmt.Sprintf("\n\n--- POD CONTAINER CONFIGURATIONS ---\n%s\n---------------------------------", cmdArgsStr)
	}

	logCmd := exec.CommandContext(ctx, "bash", "-c", fmt.Sprintf("kubectl logs %s -n %s --all-containers --tail=20 || kubectl logs %s -n %s --all-containers --tail=20 --previous", actualPod, namespace, actualPod, namespace))
	logOut, _ := logCmd.CombinedOutput()
	logStr := strings.TrimSpace(string(logOut))

	prompt += "\n\nCRITICAL NOTE: The user might ask you to 'check logs' or the error might be CrashLoopBackOff. DO NOT reply saying 'I cannot read logs'! The recent logs and container configurations have already been automatically fetched and are ATTACHED! READ THE LOGS AND CONFIGS to find the root cause (e.g. a typo in a sleep command), and directly output a 'kubectl patch deployment' command to fix it!"
	if len(logStr) > 0 {
		if len(logStr) < 2000 {
			prompt += fmt.Sprintf("\n\n--- INJECTED POD LOGS (Last 20 Lines) ---\n%s\n---------------------------------", logStr)
		} else {
			prompt += fmt.Sprintf("\n\n--- INJECTED POD LOGS (Last 20 Lines) ---\n%s\n---------------------------------", logStr[:2000]+" ...[TRUNCATED]")
		}
	} else {
		prompt += "\n\n--- INJECTED POD LOGS (Last 20 Lines) ---\n(Empty - Container crashed too fast to produce logs or pod was deleted. Rely on the POD CONTAINER CONFIGURATIONS above to spot mistakes like invalid sleep arguments!)\n---------------------------------"
	}

	os.WriteFile("dump.txt", []byte(prompt), 0644)
}
