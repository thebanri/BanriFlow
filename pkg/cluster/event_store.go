package cluster

import (
	"archive/zip"
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type EventLog struct {
	Timestamp time.Time `json:"timestamp"`
	Text      string    `json:"text"`
}

var (
	eventLogPath string
	archiveDir   string
	clients      = make(map[chan string]bool)
	clientsMutex sync.Mutex
	broadcast    = make(chan string)
)

func init() {
	home, _ := os.UserHomeDir()
	baseDir := filepath.Join(home, ".kubesight_logs")
	os.MkdirAll(baseDir, 0755)
	eventLogPath = filepath.Join(baseDir, "events.jsonl")
	archiveDir = filepath.Join(baseDir, "archives")
	os.MkdirAll(archiveDir, 0755)

	go startArchiverRoutine()
	go handleBroadcast()
}

func handleBroadcast() {
	for msg := range broadcast {
		clientsMutex.Lock()
		for client := range clients {
			client <- msg
		}
		clientsMutex.Unlock()
	}
}

// AddClient SSE için yeni client ekler
func AddClient(c chan string) {
	clientsMutex.Lock()
	clients[c] = true
	clientsMutex.Unlock()
}

// RemoveClient client'ı siler
func RemoveClient(c chan string) {
	clientsMutex.Lock()
	delete(clients, c)
	close(c) // close channel when removing
	clientsMutex.Unlock()
}

// SaveEvent appends a new event to the log file AND broadcasts it
func SaveEvent(text string) {
	// SSE stream'in (EventSource) bozulmaması için \n ve \r karakterlerini temizle
	cleanText := strings.ReplaceAll(text, "\n", " ")
	cleanText = strings.ReplaceAll(cleanText, "\r", "")

	ev := EventLog{
		Timestamp: time.Now(),
		Text:      cleanText,
	}
	b, err := json.Marshal(ev)
	if err != nil {
		return
	}

	f, err := os.OpenFile(eventLogPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err == nil {
		defer f.Close()
		f.Write(b)
		f.WriteString("\n")
	}

	// Tüm bağlı SSE clientlarına gönder
	broadcast <- text
}

// GetRecentEvents retrieves events from the last 'days' days.
func GetRecentEvents(days int) []EventLog {
	cutoff := time.Now().AddDate(0, 0, -days)
	var results []EventLog

	f, err := os.Open(eventLogPath)
	if err != nil {
		return results
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		var ev EventLog
		if err := json.Unmarshal(scanner.Bytes(), &ev); err == nil {
			if ev.Timestamp.After(cutoff) {
				results = append(results, ev)
			}
		}
	}
	return results
}

// startArchiverRoutine runs periodically to zip events older than 7 days
func startArchiverRoutine() {
	for {
		archiveOldEvents()
		time.Sleep(24 * time.Hour)
	}
}

func archiveOldEvents() {
	cutoff := time.Now().AddDate(0, 0, -7)

	f, err := os.Open(eventLogPath)
	if err != nil {
		return
	}

	var recentEvents []EventLog
	var oldEvents []EventLog

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		var ev EventLog
		if err := json.Unmarshal(scanner.Bytes(), &ev); err == nil {
			if ev.Timestamp.Before(cutoff) {
				oldEvents = append(oldEvents, ev)
			} else {
				recentEvents = append(recentEvents, ev)
			}
		}
	}
	f.Close()

	if len(oldEvents) > 0 {
		// Create zip archive
		archiveName := fmt.Sprintf("archive_%s.zip", time.Now().Format("2006-01-02_15-04-05"))
		zipPath := filepath.Join(archiveDir, archiveName)
		zf, err := os.Create(zipPath)
		if err == nil {
			zw := zip.NewWriter(zf)
			fWriter, _ := zw.Create("events.jsonl")
			for _, ev := range oldEvents {
				b, _ := json.Marshal(ev)
				fWriter.Write(b)
				fWriter.Write([]byte("\n"))
			}
			zw.Close()
			zf.Close()

			// Rewrite original file with only recent events
			tmpPath := eventLogPath + ".tmp"
			tf, _ := os.Create(tmpPath)
			for _, ev := range recentEvents {
				b, _ := json.Marshal(ev)
				tf.Write(b)
				tf.WriteString("\n")
			}
			tf.Close()
			os.Rename(tmpPath, eventLogPath)
		}
	}
}
