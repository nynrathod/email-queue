package main

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
	app := fiber.New()

	// Global middleware
	app.Use(cors.New(cors.Config{AllowOrigins: "*"})) // In production, restrict to trusted domains.
	app.Use(logger.New())

	// Initialize environment variables
	//env := cfg.InitEnvConfigs()

	// Connect to PostgreSQL and obtain DB instance
	//db := cfg.ConnectDB()

	app.Listen(":3000")
}
