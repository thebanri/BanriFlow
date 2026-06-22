package parser

import (
	"fmt"

	"github.com/hashicorp/hcl/v2/hclparse"
)

// ParseTF reads and structurally validates a Terraform HCL file.
func ParseTF(filePath string) error {
	parser := hclparse.NewParser()
	
	_, diags := parser.ParseHCLFile(filePath)
	if diags.HasErrors() {
		return fmt.Errorf("failed to parse tf file: %s", diags.Error())
	}

	return nil
}
