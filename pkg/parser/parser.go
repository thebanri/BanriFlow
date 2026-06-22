package parser

import (
	"fmt"
	"path/filepath"
	"strings"
)

// ParseFile determines the file type and parses it accordingly.
func ParseFile(filePath string) error {
	ext := strings.ToLower(filepath.Ext(filePath))
	
	switch ext {
	case ".yaml", ".yml":
		return ParseK8s(filePath)
	case ".tf":
		return ParseTF(filePath)
	default:
		return fmt.Errorf("unsupported file extension: %s", ext)
	}
}
