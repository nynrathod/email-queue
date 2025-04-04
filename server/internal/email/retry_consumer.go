package email

import (
	"encoding/json"
	"fmt"
	"github.com/nynrathod/email-queue/internal/domain"
	amqp "github.com/rabbitmq/amqp091-go"
	"log"
	"time"
)

func StartFailedQueueConsumer(ch *amqp.Channel) {
	q, err := ch.QueueDeclare(
		"failed_email_queue",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Fatalf("queue declare failed: %v", err)
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
		log.Fatalf("queue consume failed: %v", err)
	}

	fmt.Println("listening for failed email events...")

	go func() {
		emailService := NewEmailService()
		retryTicker := time.NewTicker(10 * time.Second)

		for {
			select {
			case <-retryTicker.C:
				fmt.Println("retrying failed emails...")

				for d := range msgs {
					var event domain.SendEmailEvent
					if err := json.Unmarshal(d.Body, &event); err != nil {
						fmt.Println("invalid message format:", err)
						continue
					}

					authToken, err := GetValidAuth(event.UserID, event.TenantID)
					if err != nil {
						fmt.Println("failed to get auth token:", err)
						continue
					}

					err = emailService.SendGmail(authToken.AccessToken, authToken.Email, event)
					if err != nil {
						fmt.Println("send failed:", err)
					} else {
						fmt.Println("successfully retried email:", event)
					}
				}
			}
		}
	}()
}
