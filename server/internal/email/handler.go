package email

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nynrathod/email-queue/internal/domain"
	amqp "github.com/rabbitmq/amqp091-go"
)

type EmailHandler struct {
	amqpCh *amqp.Channel
}

func NewEmailHandler(ch *amqp.Channel) *EmailHandler {
	return &EmailHandler{amqpCh: ch}
}

func (h *EmailHandler) SendEmailHandler(c *fiber.Ctx) error {
	req := new(domain.EmailRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	// Create event and publish to queue
	event := domain.SendEmailEvent{
		ToAddress: req.To,
		TenantID:  req.TenantID,
		UserID:    req.UserID,
		Subject:   req.Subject,
		Body:      req.Body,
	}

	if err := PublishSendEmailEvent(h.amqpCh, event); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to enqueue email"})
	}

	return c.JSON(fiber.Map{"message": "Email enqueued successfully"})
}
