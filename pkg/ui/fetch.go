package ui

import (
	"archive/zip"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// FetchAndExtractUI downloads a zip from remote URL and extracts it to dest
func FetchAndExtractUI(url string, dest string) error {
	fmt.Printf("⬇️ Arayüz (UI) %s adresinden indiriliyor...\n", url)
	
	tmpFile, err := os.CreateTemp("", "ui-*.zip")
	if err != nil {
		return err
	}
	defer os.Remove(tmpFile.Name())
	
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != 200 {
		return fmt.Errorf("sunucudan %d yanıtı alındı", resp.StatusCode)
	}
	
	_, err = io.Copy(tmpFile, resp.Body)
	if err != nil {
		return err
	}
	tmpFile.Close()

	fmt.Println("📦 UI dosyaları çıkartılıyor...")
	r, err := zip.OpenReader(tmpFile.Name())
	if err != nil {
		return err
	}
	defer r.Close()

	// Clear destination first if exists
	os.RemoveAll(dest)
	os.MkdirAll(dest, os.ModePerm)

	for _, f := range r.File {
		// Prevent ZipSlip
		fpath := filepath.Join(dest, f.Name)
		if !strings.HasPrefix(fpath, filepath.Clean(dest)+string(os.PathSeparator)) {
			continue
		}

		if f.FileInfo().IsDir() {
			os.MkdirAll(fpath, os.ModePerm)
			continue
		}

		if err := os.MkdirAll(filepath.Dir(fpath), os.ModePerm); err != nil {
			return err
		}

		outFile, err := os.OpenFile(fpath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			outFile.Close()
			return err
		}

		io.Copy(outFile, rc)
		outFile.Close()
		rc.Close()
	}
	
	fmt.Println("✅ UI başarıyla indirildi ve kuruldu.")
	return nil
}
