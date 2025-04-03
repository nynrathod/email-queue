package config

import (
	"github.com/spf13/viper"
	"log"
)

var EnvConfigs *envConfigs

type envConfigs struct {
	DbName     string `mapstructure:"DB_NAME"`
	DbHost     string `mapstructure:"DB_HOST"`
	DbUser     string `mapstructure:"DB_USER"`
	DbPassword string `mapstructure:"DB_PASSWORD"`
}

func InitEnvConfigs() *envConfigs {
	EnvConfigs = loadEnvVariables()
	return EnvConfigs
}

// loadEnvVariables loads the environment variables from .env and unmarshals them.
func loadEnvVariables() *envConfigs {
	viper.SetConfigFile(".env")
	viper.AutomaticEnv()

	// Viper reads the configuration file
	if err := viper.ReadInConfig(); err != nil {
		log.Fatal("Error reading env file", err)
	}

	// Unmarshal the environment variables into the struct.
	var config envConfigs
	if err := viper.Unmarshal(&config); err != nil {
		log.Fatal(err)
	}
	return &config
}
