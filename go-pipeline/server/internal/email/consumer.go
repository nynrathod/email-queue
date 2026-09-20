package email

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/nynrathod/email-queue/internal/domain"
	amqp "github.com/rabbitmq/amqp091-go"
)

func StartQueueConsumer(ch *amqp.Channel) {
	q, err := ch.QueueDeclare(
		"email_queue",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Fatalf("Queue declare failed: %v", err)
	}

	msgs, err := ch.Consume(
		q.Name,
		"",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Fatalf("Queue consume failed: %v", err)
	}

	fmt.Println("Started queue consumer...")

	go func() {
		emailService := NewEmailService()

		for d := range msgs {
			fmt.Println("Received message:", string(d.Body))

			var event domain.SendEmailEvent
			if err := json.Unmarshal(d.Body, &event); err != nil {
				fmt.Println("Invalid message format:", err)
				continue
			}

			authToken, err := GetValidAuth(event.UserID, event.TenantID)
			if err != nil {
				fmt.Println("Token fetch failed:", err)
				continue
			}

			var sendErr error
			switch authToken.Provider {
			case "google":
				sendErr = emailService.SendGmail(authToken.AccessToken, authToken.Email, event)
			case "microsoft":
				sendErr = emailService.SendOutlook(authToken.AccessToken, authToken.Email, event)
			default:
				sendErr = fmt.Errorf("unknown provider: %s", authToken.Provider)
			}

			if sendErr != nil {
				log.Printf("Failed to send email: %v", sendErr)
			} else {
				fmt.Println("Email sent to:", event.ToAddress)
			}
		}
	}()
}
