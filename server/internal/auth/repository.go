package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/nynrathod/email-queue/internal/domain"
	"gorm.io/gorm"
)

type TokenRepository struct {
	DB *gorm.DB
}

func NewTokenRepository(db *gorm.DB) *TokenRepository {
	return &TokenRepository{DB: db}
}

// SaveOrUpdateToken saves a new token or updates an existing one
func (r *TokenRepository) SaveOrUpdateToken(
	userID, tenantID, provider, accessToken, refreshToken string,
	expiry time.Time, email string,
) error {
	var existing domain.Auth

	err := r.DB.Where("user_id = ? AND tenant_id = ? AND provider = ?", userID, tenantID, provider).
		First(&existing).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		newToken := domain.Auth{
			UserID:       userID,
			TenantID:     tenantID,
			Provider:     provider,
			Email:        email,
			AccessToken:  accessToken,
			RefreshToken: refreshToken,
			ExpiresAt:    expiry,
		}
		if err := r.DB.Create(&newToken).Error; err != nil {
			return err
		}
		fmt.Println("Created new token for provider:", provider)
		return nil
	}

	if err != nil {
		return err
	}

	existing.Email = email
	existing.AccessToken = accessToken
	existing.RefreshToken = refreshToken
	existing.ExpiresAt = expiry
	existing.UpdatedAt = time.Now()

	if err := r.DB.Save(&existing).Error; err != nil {
		return err
	}
	fmt.Println("Updated existing token for provider:", provider)
	return nil
}
