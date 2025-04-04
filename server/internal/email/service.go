package email

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

type EmailService struct{}

func NewEmailService() *EmailService {
	return &EmailService{}
}

func (s *EmailService) SendGmail(accessToken, to, subject, body string) error {
	rawEmail := fmt.Sprintf("From: me\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"Date: %s\r\n"+
		"MIME-Version: 1.0\r\n"+
		"Content-Type: text/plain; charset=\"utf-8\"\r\n"+
		"Content-Transfer-Encoding: 7bit\r\n\r\n"+
		"%s",
		to,
		subject,
		time.Now().Format(time.RFC1123Z),
		body)

	// Encode email
	encoded := base64.URLEncoding.EncodeToString([]byte(rawEmail))
	encoded = strings.ReplaceAll(encoded, "+", "-")
	encoded = strings.ReplaceAll(encoded, "/", "_")
	encoded = strings.TrimRight(encoded, "=")

	payload := map[string]string{"raw": encoded}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("❌ Failed to marshal email payload: %v\n", err)
		return fmt.Errorf("failed to marshal payload: %v", err)
	}

	req, err := http.NewRequest("POST", "https://gmail.googleapis.com/gmail/v1/users/me/messages/send", bytes.NewBuffer(payloadBytes))
	if err != nil {
		log.Printf("❌ Failed to create Gmail request: %v\n", err)
		return fmt.Errorf("failed to create Gmail request: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("❌ Failed to send request to Gmail API: %v\n", err)
		return fmt.Errorf("failed to send request to Gmail API: %v", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ Gmail API Error: %s\nResponse Body: %s\n", resp.Status, string(respBody))
		return fmt.Errorf("Gmail API error: %s", resp.Status)
	}

	log.Printf("✅ Email sent successfully to %s\n", to)
	return nil
}
