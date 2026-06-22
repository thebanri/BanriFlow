package parser

import (
	"bytes"
	"fmt"
	"os"

	"k8s.io/apimachinery/pkg/util/yaml"
)

// ParseK8s reads and structurally validates a Kubernetes YAML file.
func ParseK8s(filePath string) error {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to read k8s file: %w", err)
	}

	decoder := yaml.NewYAMLOrJSONDecoder(bytes.NewReader(data), 4096)
	
	// A file can contain multiple YAML documents separated by "---"
	for {
		var obj map[string]interface{}
		err := decoder.Decode(&obj)
		if err != nil {
			if err.Error() == "EOF" {
				break
			}
			return fmt.Errorf("failed to parse k8s yaml: %w", err)
		}
	}

	return nil
}
