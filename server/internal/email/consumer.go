package email

import (
	"encoding/json"
	"log"

	"github.com/nynrathod/email-queue/internal/domain"

	amqp "github.com/rabbitmq/amqp091-go"
)

func StartQueueConsumer(ch *amqp.Channel) {
	q, err := ch.QueueDeclare(
		"email_queue", // name
		true,          // durable
		false,         // delete when unused
		false,         // not exclusive
		false,         // no-wait
		nil,           // arguments
	)
	if err != nil {
		log.Fatalf("Queue declare failed: %v", err)
	}

	msgs, err := ch.Consume(
		q.Name,
		"",    // consumer tag
		true,  // auto-ack
		false, // not exclusive
		false, // no-local
		false, // no-wait
		nil,   // args
	)
	if err != nil {
		log.Fatalf("Queue consume failed: %v", err)
	}

	log.Println("📥 Listening for email events...")

	go func() {
		for d := range msgs {
			log.Printf("📨 Received message: %s", d.Body)

			var event domain.SendEmailEvent
			if err := json.Unmarshal(d.Body, &event); err != nil {
				log.Printf("❌ Invalid message format: %v", err)
				continue
			}

			// Call email consumer
			// go HandleSendEmail(event)
		}
	}()
}
