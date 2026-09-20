package email

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/nynrathod/email-queue/internal/domain"
	amqp "github.com/rabbitmq/amqp091-go"
)

func PublishSendEmailEvent(ch *amqp.Channel, queueName string, event domain.SendEmailEvent) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	q, err := ch.QueueDeclare(
		queueName,
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		fmt.Println("queue declare error:", err)
		return err
	}

	body, err := json.Marshal(event)
	if err != nil {
		fmt.Println("marshal error:", err)
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
		fmt.Println("publish error:", err)
		return err
	}

	fmt.Println("published event to queue:", queueName, event)
	return nil
}
