package email

import (
	"bytes"
	"encoding/base64"
	"encoding/json"

	"fmt"
	cfg "github.com/nynrathod/email-queue/config"
	"github.com/nynrathod/email-queue/internal/domain"
	amqp "github.com/rabbitmq/amqp091-go"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

type EmailService struct {
	amqpChannel *amqp.Channel
}

func NewEmailService() *EmailService {
	return &EmailService{}
}

func (s *EmailService) SendGmail(accessToken, email string, event domain.SendEmailEvent) error {
	if IsDisposableEmail(event.ToAddress) {
		return fmt.Errorf("disposable email detected: %s", event.ToAddress)
	}

	rawEmail := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nDate: %s\r\n"+
			"MIME-Version: 1.0\r\nContent-Type: text/plain; charset=\"utf-8\"\r\n"+
			"Content-Transfer-Encoding: 7bit\r\n\r\n%s",
		email,
		event.ToAddress,
		event.Subject,
		time.Now().Format(time.RFC1123Z),
		event.Body,
	)

	encoded := base64.URLEncoding.EncodeToString([]byte(rawEmail))
	encoded = strings.ReplaceAll(encoded, "+", "-")
	encoded = strings.ReplaceAll(encoded, "/", "_")
	encoded = strings.TrimRight(encoded, "=")

	payload := map[string]string{"raw": encoded}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal payload failed: %w", err)
	}

	req, err := http.NewRequest("POST", "https://gmail.googleapis.com/gmail/v1/users/me/messages/send", bytes.NewBuffer(payloadBytes))
	if err != nil {
		return fmt.Errorf("create Gmail request failed: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("Gmail API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		_ = PublishSendEmailEvent(s.amqpChannel, "failed_email_queue", event)
		body, _ := io.ReadAll(resp.Body)
		log.Printf("gmail API error [%d]: %s", resp.StatusCode, body)
		return fmt.Errorf("gmail API error: %s", resp.Status)
	}

	s.trackQuota(email)
	return nil
}

func (s *EmailService) SendOutlook(accessToken, email string, event domain.SendEmailEvent) error {
	if IsDisposableEmail(event.ToAddress) {
		return fmt.Errorf("disposable email detected: %s", event.ToAddress)
	}

	payload := map[string]interface{}{
		"message": map[string]interface{}{
			"subject": event.Subject,
			"body": map[string]string{
				"contentType": "Text",
				"content":     event.Body,
			},
			"toRecipients": []map[string]map[string]string{
				{"emailAddress": {"address": event.ToAddress}},
			},
		},
		"saveToSentItems": "true",
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal outlook payload failed: %w", err)
	}

	req, err := http.NewRequest("POST", "https://graph.microsoft.com/v1.0/me/sendMail", bytes.NewBuffer(payloadBytes))
	if err != nil {
		return fmt.Errorf("create outlook request failed: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("outlook API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		_ = PublishSendEmailEvent(s.amqpChannel, "failed_email_queue", event)
		body, _ := io.ReadAll(resp.Body)
		log.Printf("outlook API error [%d]: %s", resp.StatusCode, body)
		return fmt.Errorf("outlook API error: %s", resp.Status)
	}

	s.trackQuota(email)
	return nil
}

func (s *EmailService) trackQuota(email string) {
	db := cfg.GetDB()
	var auth domain.Auth
	if err := db.Where("email = ?", email).First(&auth).Error; err == nil {
		auth.DailyEmailCount++
		auth.LastSentAt = time.Now()
		db.Save(&auth)
	}
}
