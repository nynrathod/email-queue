package config

import (
	"fmt"
	"log"

	"github.com/spf13/viper"
)

var EnvConfigs *envConfigs

type envConfigs struct {
	DbName                 string `mapstructure:"DB_NAME"`
	DbHost                 string `mapstructure:"DB_HOST"`
	DbUser                 string `mapstructure:"DB_USER"`
	DbPassword             string `mapstructure:"DB_PASSWORD"`
	DbPort                 string `mapstructure:"DB_PORT"`
	RabbitMQURL            string `mapstructure:"RABBITMQ_URL"`
	GoogleClientId         string `mapstructure:"OAUTH_GOOGLE_CLIENT_ID"`
	GoogleClientSecrete    string `mapstructure:"OAUTH_GOOGLE_CLIENT_SECRETE"`
	MicrosoftClientId      string `mapstructure:"OAUTH_MICROSOFT_CLIENT_ID"`
	MicrosoftClientSecrete string `mapstructure:"OAUTH_MICROSOFT_CLIENT_SECRETE"`
}

func InitEnvConfigs() *envConfigs {
	EnvConfigs = loadEnvVariables()
	return EnvConfigs
}

func loadEnvVariables() *envConfigs {
	viper.SetConfigFile(".env")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		log.Fatal("Error reading .env file:", err)
	}

	var config envConfigs
	if err := viper.Unmarshal(&config); err != nil {
		log.Fatal("Failed to unmarshal env config:", err)
	}

	fmt.Println("Environment variables loaded successfully")
	return &config
}
