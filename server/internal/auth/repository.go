package auth

import (
	"errors"
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

// Save or update token
func (r *TokenRepository) SaveOrUpdateToken(userID, tenantID, provider, accessToken, refreshToken string, expiry time.Time) error {
	var existingToken domain.Auth

	// Check if token already exists
	err := r.DB.Where("user_id = ? AND tenant_id = ? AND provider = ?", userID, tenantID, provider).First(&existingToken).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		// Create new record if not found
		newToken := domain.Auth{
			UserID:       userID,
			TenantID:     tenantID,
			Provider:     provider,
			AccessToken:  accessToken,
			RefreshToken: refreshToken,
			ExpiresAt:    expiry, // Fix field name to match struct
		}
		return r.DB.Create(&newToken).Error
	} else if err != nil {
		return err
	}

	// Update existing record
	existingToken.AccessToken = accessToken
	existingToken.RefreshToken = refreshToken
	existingToken.ExpiresAt = expiry
	existingToken.UpdatedAt = time.Now()

	return r.DB.Save(&existingToken).Error
}
