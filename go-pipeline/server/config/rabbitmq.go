package config

import (
	"fmt"
	"log"

	amqp "github.com/rabbitmq/amqp091-go"
)

func ConnectRabbitMQ() *amqp.Connection {
	rabbitURL := EnvConfigs.RabbitMQURL
	conn, err := amqp.Dial(rabbitURL)
	if err != nil {
		log.Fatalf("🐰 Failed to connect to RabbitMQ: %v", err)
	}
	fmt.Println("Connected to RabbitMQ")
	return conn
}
