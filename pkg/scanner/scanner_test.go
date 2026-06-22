package scanner

import (
	"os"
	"path/filepath"
	"testing"
)

func TestScanFiles(t *testing.T) {
	// Create a temporary directory
	tempDir, err := os.MkdirTemp("", "scanner_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create some dummy files
	filesToCreate := []string{
		"test.yaml",
		"test.yml",
		"test.tf",
		"ignore.txt",
		"ignore.md",
		filepath.Join("sub", "test2.yaml"),
		filepath.Join("sub", "ignore2.txt"),
	}

	for _, f := range filesToCreate {
		fullPath := filepath.Join(tempDir, f)
		err := os.MkdirAll(filepath.Dir(fullPath), 0755)
		if err != nil {
			t.Fatalf("Failed to create dir for %s: %v", f, err)
		}
		err = os.WriteFile(fullPath, []byte("test"), 0644)
		if err != nil {
			t.Fatalf("Failed to write file %s: %v", f, err)
		}
	}

	// Run scanner
	files, err := ScanFiles(tempDir)
	if err != nil {
		t.Fatalf("ScanFiles failed: %v", err)
	}

	// Check results
	expectedFiles := 4 // test.yaml, test.yml, test.tf, sub/test2.yaml
	if len(files) != expectedFiles {
		t.Errorf("Expected %d files, got %d", expectedFiles, len(files))
	}
}
