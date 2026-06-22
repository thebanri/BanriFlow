package scanner

import (
	"io/fs"
	"path/filepath"
	"strings"
)

// ScanFiles recursively searches for .yaml, .yml, and .tf files in the given directory.
func ScanFiles(rootDir string) ([]string, error) {
	var files []string

	err := filepath.WalkDir(rootDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err // Return the error to stop walking or log it
		}
		
		if !d.IsDir() {
			ext := strings.ToLower(filepath.Ext(path))
			if ext == ".yaml" || ext == ".yml" || ext == ".tf" {
				files = append(files, path)
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return files, nil
}
