//go:build windows

package cmd

import (
	"os/exec"
)

func setSysProcAttr(cmd *exec.Cmd) {
	// Windows için Setsid desteklenmiyor, arka plan işlemi için boş bırakıyoruz
}
