package email

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/nynrathod/email-queue/internal/domain"
	amqp "github.com/rabbitmq/amqp091-go"
)

func PublishSendEmailEvent(ch *amqp.Channel, event domain.SendEmailEvent) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	q, err := ch.QueueDeclare(
		"email_queue",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Printf("❌ Failed to declare queue: %v", err)
		return err
	}

	body, err := json.Marshal(event)
	if err != nil {
		log.Printf("❌ Failed to marshal event: %v", err)
		return err
	}

	err = ch.PublishWithContext(
		ctx,
		"",
		q.Name,
		false,
		false,
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
		},
	)
	if err != nil {
		log.Printf("❌ Failed to publish message: %v", err)
		return err
	}

	log.Printf("📤 Published event to queue: %+v", event)
	return nil
}
