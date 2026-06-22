package cluster

import (
	"context"
	"fmt"
	"path/filepath"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
)

type GraphNode struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Group       string `json:"group"` // "pod", "service", "deployment"
	Status      string `json:"status"` // "ok", "error" (for red nodes)
	IP          string `json:"ip"`
	Restarts    int32  `json:"restarts"`
	CPU         string `json:"cpu"`
	Memory      string `json:"memory"`
	Details     string `json:"details"`
}

type GraphLink struct {
	Source string `json:"source"`
	Target string `json:"target"`
	Status string `json:"status"` // "ok", "blocked" (red connection)
}

type GraphData struct {
	Nodes []GraphNode `json:"nodes"`
	Links []GraphLink `json:"links"`
}

func FetchGraphData(ctx context.Context) (*GraphData, error) {
	var kubeconfig string
	if home := homedir.HomeDir(); home != "" {
		kubeconfig = filepath.Join(home, ".kube", "config")
	}

	config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		return nil, fmt.Errorf("failed to load kubeconfig: %v", err)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	data := &GraphData{
		Nodes: make([]GraphNode, 0),
		Links: make([]GraphLink, 0),
	}

	// Fetch Pods
	pods, _ := clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	for _, p := range pods.Items {
		status := "ok"
		restarts := int32(0)
		if len(p.Status.ContainerStatuses) > 0 {
			restarts = p.Status.ContainerStatuses[0].RestartCount
			if restarts > 2 || !p.Status.ContainerStatuses[0].Ready {
				status = "error" // Node will be red
			}
		}

		cpu := "N/A"
		mem := "N/A"
		if len(p.Spec.Containers) > 0 {
			reqs := p.Spec.Containers[0].Resources.Requests
			if reqs.Cpu() != nil {
				cpu = reqs.Cpu().String()
			}
			if reqs.Memory() != nil {
				mem = reqs.Memory().String()
			}
		}

		data.Nodes = append(data.Nodes, GraphNode{
			ID:       string(p.UID),
			Name:     p.Name,
			Group:    "pod",
			Status:   status,
			IP:       p.Status.PodIP,
			Restarts: restarts,
			CPU:      cpu,
			Memory:   mem,
			Details:  fmt.Sprintf("Namespace: %s\nPhase: %s", p.Namespace, p.Status.Phase),
		})
	}

	// Fetch Services and link them to Pods
	svcs, _ := clientset.CoreV1().Services("").List(ctx, metav1.ListOptions{})
	for _, s := range svcs.Items {
		data.Nodes = append(data.Nodes, GraphNode{
			ID:      string(s.UID),
			Name:    s.Name,
			Group:   "service",
			Status:  "ok",
			IP:      s.Spec.ClusterIP,
			Details: fmt.Sprintf("Type: %s", s.Spec.Type),
		})

		for _, p := range pods.Items {
			match := true
			for k, v := range s.Spec.Selector {
				if p.Labels[k] != v {
					match = false
					break
				}
			}
			if match && len(s.Spec.Selector) > 0 {
				data.Links = append(data.Links, GraphLink{
					Source: string(s.UID),
					Target: string(p.UID),
					Status: "ok",
				})
			}
		}
	}

	return data, nil
}
