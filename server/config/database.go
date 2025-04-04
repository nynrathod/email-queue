package config

import (
	"fmt"
	"log"

	"github.com/nynrathod/email-queue/internal/domain"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB is the global database instance
var DB *gorm.DB

// ConnectDB initializes the PostgreSQL connection
func ConnectDB() *gorm.DB {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Singapore",
		EnvConfigs.DbHost,
		EnvConfigs.DbUser,
		EnvConfigs.DbPassword,
		EnvConfigs.DbName,
		EnvConfigs.DbPort,
	)
	fmt.Println("Connecting to PostgreSQL...")

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatal("Failed to connect to DB:", err)
	}

	DB = db
	fmt.Println("PostgreSQL connection established")

	MigrateDB()
	return DB
}

// GetDB returns the global DB instance
func GetDB() *gorm.DB {
	return DB
}

// MigrateDB runs migrations for models
func MigrateDB() {
	err := DB.AutoMigrate(
		&domain.Auth{},
	)
	if err != nil {
		log.Fatal("Database migration failed:", err)
	}
	fmt.Println("Database migration completed")
}
