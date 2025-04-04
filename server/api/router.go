package api

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nynrathod/email-queue/config"
	"github.com/nynrathod/email-queue/internal/auth"
	"github.com/nynrathod/email-queue/internal/email"
	amqp "github.com/rabbitmq/amqp091-go"
	//"github.com/nynrathod/email-microservice/config"
)

func SetupRoutes(app *fiber.App, amqpCh *amqp.Channel) {

	db := config.GetDB() // Get DB instance

	repo := auth.NewTokenRepository(db)       // Initialize repository
	authService := auth.NewOAuthService(repo) // Inject repo into service
	authHandler := auth.NewAuthHandler(authService)

	api := app.Group("/auth")

	api.Post("/google/login", authHandler.GoogleLogin)
	api.Get("/google/callback", authHandler.GoogleCallback)

	emailHandler := email.NewEmailHandler(amqpCh)

	emailGroup := app.Group("/email")
	emailGroup.Post("/send-email", emailHandler.SendEmailHandler)
	// api.Get("/microsoft/login", authHandler.MicrosoftLogin)
	// api.Get("/microsoft/callback", authHandler.MicrosoftCallback)
}
