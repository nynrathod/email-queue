package config

import (
	"fmt"
	"os/user"

	"log"

	//"github.com/nynrathod/uber-ride/internal/user"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB is the global database instance.
var DB *gorm.DB

// ConnectDB initializes the PostgreSQL connection and returns the DB instance.
func ConnectDB() *gorm.DB {
	// Build the DSN using the environment configuration.
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Singapore",
		EnvConfigs.DbHost,
		EnvConfigs.DbUser,
		EnvConfigs.DbPassword,
		EnvConfigs.DbName,
	)
	fmt.Println("DSN:", dsn)

	// Connect to PostgreSQL using GORM.
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info), // Enable SQL logging
	})

	if err != nil {
		log.Fatal("❌ Failed to connect to DB:", err)
	}

	// Set the global DB instance.
	DB = db
	log.Println("✅ Connected to PostgreSQL successfully!")

	// Run auto-migrations.
	MigrateDB()

	return DB
}

// GetDB returns the global database instance.
func GetDB() *gorm.DB {
	return DB
}

// MigrateDB runs auto-migration for all models.
func MigrateDB() {
	err := DB.AutoMigrate(
		&user.User{},
	)
	if err != nil {
		log.Fatal("❌ Migration failed:", err)
	}

	log.Println("✅ Database Migration Completed!")
}
