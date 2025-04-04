package main

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/nynrathod/email-queue/api"
	cfg "github.com/nynrathod/email-queue/config"
	"github.com/nynrathod/email-queue/internal/email"
)

func main() {
	cfg.InitEnvConfigs()
	cfg.ConnectDB()

	rabbitConn := cfg.ConnectRabbitMQ()
	defer rabbitConn.Close()

	ch, err := rabbitConn.Channel()
	if err != nil {
		panic(fmt.Errorf("unable to open RabbitMQ channel: %v", err))
	}
	defer ch.Close()

	fmt.Println("RabbitMQ channel initialized")

	email.StartQueueConsumer(ch)
	email.StartFailedQueueConsumer(ch)

	app := fiber.New()
	app.Use(cors.New())
	app.Use(logger.New())

	api.SetupRoutes(app, ch)

	fmt.Println("Server listening on :5000")
	app.Listen(":5000")
}
