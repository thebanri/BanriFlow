package cluster

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
	"sigs.k8s.io/yaml"
)

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
