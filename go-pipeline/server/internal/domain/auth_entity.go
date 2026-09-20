package domain

import "time"

type Auth struct {
	ID           uint   `gorm:"primaryKey;autoIncrement"`
	UserID       string `gorm:"index;not null"`
	TenantID     string `gorm:"index;not null"`
	Provider     string `gorm:"not null"`
	AccessToken  string `gorm:"type:text;not null"`
	RefreshToken string `gorm:"type:text"`
	Email        string `gorm:"column:email"`

	DailyEmailCount int       `gorm:"default:0"`
	LastSentAt      time.Time `gorm:"default:CURRENT_TIMESTAMP"`

	ExpiresAt time.Time `gorm:"not null"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`
}
