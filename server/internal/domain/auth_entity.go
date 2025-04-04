package domain

import "time"

type Auth struct {
	ID           uint      `gorm:"primaryKey;autoIncrement"`
	UserID       string    `gorm:"index;not null"`
	TenantID     string    `gorm:"index;not null"`
	Provider     string    `gorm:"not null"`
	AccessToken  string    `gorm:"type:text;not null"`
	RefreshToken string    `gorm:"type:text"`
	ExpiresAt    time.Time `gorm:"not null"`
	CreatedAt    time.Time `gorm:"autoCreateTime"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime"`
}
