package cluster

import (
	"context"
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/thebanri/BanriFlow/pkg/analyzer"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
	"sigs.k8s.io/yaml"
)

var aiSolutionCache sync.Map
var processedEvents sync.Map

// StartGlobalEventWatcher connects to the cluster and watches events continuously.
func StartGlobalEventWatcher(ctx context.Context, aiProvider string) error {
	var kubeconfig string
	if home := homedir.HomeDir(); home != "" {
		kubeconfig = filepath.Join(home, ".kube", "config")
	}

	config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		return err
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return err
	}

	for {
		watcher, err := clientset.CoreV1().Events("").Watch(ctx, metav1.ListOptions{})
		if err != nil {
			time.Sleep(5 * time.Second)
			continue
		}

		func() {
			defer watcher.Stop()
			for {
				select {
				case <-ctx.Done():
					return
				case event, ok := <-watcher.ResultChan():
					if !ok {
						// Watch channel closed (normal K8s timeout). Break inner loop to recreate watcher.
						return
					}
					k8sEvent, ok := event.Object.(*corev1.Event)
					if ok {
						// Eğer bu olayı daha önce aynı tekrar sayısıyla (Count) işlediysek atla.
						// Böylece olay tekrar ettiğinde (örn. CrashLoopBackOff) yenisini yakalarız.
						lastCount, exists := processedEvents.Load(k8sEvent.UID)
						if exists && lastCount.(int32) == k8sEvent.Count {
							continue
						}
						processedEvents.Store(k8sEvent.UID, k8sEvent.Count)

						msg := fmt.Sprintf("[%s] %s/%s: %s", k8sEvent.Type, k8sEvent.InvolvedObject.Namespace, k8sEvent.InvolvedObject.Name, k8sEvent.Message)
						SaveEvent(msg)

						// If it's a Warning, ask AI for a solution
						if k8sEvent.Type == "Warning" {
							// Check if the Pod still exists before processing the warning.
							if k8sEvent.InvolvedObject.Kind == "Pod" {
								pod, err := clientset.CoreV1().Pods(k8sEvent.InvolvedObject.Namespace).Get(ctx, k8sEvent.InvolvedObject.Name, metav1.GetOptions{})
								if err != nil || pod.DeletionTimestamp != nil {
									continue // Pod is deleted or being deleted, ignore
								}
							}

							cacheKey := k8sEvent.Message
							if _, exists := aiSolutionCache.Load(cacheKey); exists {
								// Already processed and suggested, do not spam the UI again
							} else {
								// Mark as processed immediately to prevent duplicate requests while AI is thinking
								aiSolutionCache.Store(cacheKey, "PENDING")

								go func(ns, name, errMsg, kind string) {
									var extraContext string
									if kind == "Pod" {
										// 1. Fetch Pod Logs
										logCmd := exec.CommandContext(context.Background(), "bash", "-c", fmt.Sprintf("kubectl logs %s -n %s --all-containers --tail=30 || kubectl logs %s -n %s --all-containers --tail=30 --previous", name, ns, name, ns))
										logOut, _ := logCmd.CombinedOutput()
										if lgStr := strings.TrimSpace(string(logOut)); lgStr != "" {
											extraContext += "--- POD LOGS ---\n" + lgStr + "\n"
										}

										// 2. Fetch Pod Events
										eventsCmd := exec.CommandContext(context.Background(), "bash", "-c", fmt.Sprintf("kubectl get events -n %s --field-selector involvedObject.name=%s --sort-by='.metadata.creationTimestamp' | tail -n 5", ns, name))
										eventsOut, _ := eventsCmd.CombinedOutput()
										if evStr := strings.TrimSpace(string(eventsOut)); evStr != "" {
											extraContext += "\n--- POD EVENTS ---\n" + evStr + "\n"
										}

										// 3. Fetch Container Specs (Images)
										specCmd := exec.CommandContext(context.Background(), "kubectl", "get", "pod", name, "-n", ns, "-o", "jsonpath={range .spec.containers[*]}Container: {.name}, Image: {.image}\\n{end}")
										specOut, _ := specCmd.CombinedOutput()
										if spStr := strings.TrimSpace(string(specOut)); spStr != "" {
											extraContext += "\n--- CONTAINER IMAGES ---\n" + spStr + "\n"
										}
									}

									solution, err := analyzer.AskAIForLogSolution(context.Background(), aiProvider, errMsg, extraContext)
									if err == nil && solution != "" {
										aiSolutionCache.Store(errMsg, solution) // Save the actual solution
										aiMsg := fmt.Sprintf("[AI-Ops] 💡 Çözüm Önerisi (%s/%s): %s", ns, name, solution)
										SaveEvent(aiMsg)
									} else {
										aiSolutionCache.Delete(errMsg) // Retry later if failed
										SaveEvent(fmt.Sprintf("[AI-Ops] ⚠️ Yapay zeka çözüm üretemedi (%s/%s): %v", ns, name, err))
									}
								}(k8sEvent.InvolvedObject.Namespace, k8sEvent.InvolvedObject.Name, k8sEvent.Message, k8sEvent.InvolvedObject.Kind)
							}
						}
					}
				}
			}
		}()

		// If ctx is done, exit the outer loop as well
		if ctx.Err() != nil {
			return nil
		}
	}
}

// FetchLiveState connects to the active Kubernetes cluster and extracts the topology
func FetchLiveState(ctx context.Context) (string, error) {
	var kubeconfig string
	if home := homedir.HomeDir(); home != "" {
		kubeconfig = filepath.Join(home, ".kube", "config")
	} else {
		return "", fmt.Errorf("could not find home directory to locate .kube/config")
	}

	config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		return "", fmt.Errorf("failed to load kubeconfig (is Docker Desktop / Minikube / K8s running?): %v", err)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return "", fmt.Errorf("failed to create kubernetes client: %v", err)
	}

	var sb strings.Builder
	sb.WriteString("=== LIVE KUBERNETES CLUSTER TOPOLOGY ===\n\n")

	// Get Deployments
	deps, err := clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{})
	if err == nil {
		for _, d := range deps.Items {
			// Clean up managed fields to save tokens
			d.ManagedFields = nil
			dBytes, _ := yaml.Marshal(d)
			sb.WriteString(fmt.Sprintf("--- DEPLOYMENT: %s (Namespace: %s) ---\n%s\n\n", d.Name, d.Namespace, string(dBytes)))
		}
	}

	// Get Services
	svcs, err := clientset.CoreV1().Services("").List(ctx, metav1.ListOptions{})
	if err == nil {
		for _, s := range svcs.Items {
			s.ManagedFields = nil
			sBytes, _ := yaml.Marshal(s)
			sb.WriteString(fmt.Sprintf("--- SERVICE: %s (Namespace: %s) ---\n%s\n\n", s.Name, s.Namespace, string(sBytes)))
		}
	}

	// Get NetworkPolicies
	netpols, err := clientset.NetworkingV1().NetworkPolicies("").List(ctx, metav1.ListOptions{})
	if err == nil {
		for _, n := range netpols.Items {
			n.ManagedFields = nil
			nBytes, _ := yaml.Marshal(n)
			sb.WriteString(fmt.Sprintf("--- NETWORK POLICY: %s (Namespace: %s) ---\n%s\n\n", n.Name, n.Namespace, string(nBytes)))
		}
	}

	return sb.String(), nil
}
