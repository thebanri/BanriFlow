package parser

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseFile(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "parser_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	validK8s := filepath.Join(tempDir, "valid.yaml")
	invalidK8s := filepath.Join(tempDir, "invalid.yaml")
	validTF := filepath.Join(tempDir, "valid.tf")
	invalidTF := filepath.Join(tempDir, "invalid.tf")

	// Create valid and invalid Kubernetes yamls
	os.WriteFile(validK8s, []byte("apiVersion: v1\nkind: Pod\nmetadata:\n  name: my-pod\n"), 0644)
	os.WriteFile(invalidK8s, []byte("apiVersion: v1\nkind: Pod\nmetadata:\n  name: my-pod\n  - invalid\n"), 0644)
	
	// Create valid and invalid Terraform files
	validTfContent := `resource "aws_instance" "web" {
  ami           = "ami-123"
  instance_type = "t2.micro"
}`
	os.WriteFile(validTF, []byte(validTfContent), 0644)
	os.WriteFile(invalidTF, []byte(`resource "aws_instance" "web" { ami = "ami-123"`), 0644) // missing closing brace

	tests := []struct {
		name     string
		filePath string
		wantErr  bool
	}{
		{"Valid Kubernetes", validK8s, false},
		{"Invalid Kubernetes", invalidK8s, true},
		{"Valid Terraform", validTF, false},
		{"Invalid Terraform", invalidTF, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ParseFile(tt.filePath)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseFile() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
