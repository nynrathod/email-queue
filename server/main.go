package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/nynrathod/email-queue/api"
	cfg "github.com/nynrathod/email-queue/config"
	"github.com/nynrathod/email-queue/internal/domain"
	"github.com/nynrathod/email-queue/internal/email"
)

func main() {
	// Initialize environment variables
	cfg.InitEnvConfigs()

	// Connect to PostgreSQL and obtain DB instance
	cfg.ConnectDB()

	rabbitConn := cfg.ConnectRabbitMQ()
	defer rabbitConn.Close()

	ch, err := rabbitConn.Channel()
	if err != nil {
		log.Fatalf("Failed to open RabbitMQ channel: %v", err)
	}
	defer ch.Close()

	email.StartQueueConsumer(ch)

	// starts listening
	email.PublishSendEmailEvent(ch, domain.SendEmailEvent{ToAddress: "test@example.com", Subject: "Hello", Body: "Test", TenantID: "1", UserID: "1"}) // sends test event

	app := fiber.New()
	app.Use(cors.New()) // In production, restrict to trusted domains.
	app.Use(logger.New())

	api.SetupRoutes(app, ch)

	app.Listen(":5000")
}
