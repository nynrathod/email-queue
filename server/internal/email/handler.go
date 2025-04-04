package email

import (
	"fmt"

	validate "github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/nynrathod/email-queue/internal/domain"
	amqp "github.com/rabbitmq/amqp091-go"
)

var validatorInstance = validate.New()

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

	if err := validatorInstance.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Validation failed",
			"details": err.Error(),
		})
	}

	fmt.Println("received email request:", req)

	event := domain.SendEmailEvent{
		ToAddress: req.To,
		TenantID:  req.TenantID,
		UserID:    req.UserID,
		Subject:   req.Subject,
		Body:      req.Body,
	}

	fmt.Println("publishing email event:", event)

	if err := PublishSendEmailEvent(h.amqpCh, "email_queue", event); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to enqueue email",
		})
	}

	return c.JSON(fiber.Map{"message": "Email enqueued successfully"})
}
