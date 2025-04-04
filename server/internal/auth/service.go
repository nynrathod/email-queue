package auth

import (
	"context"
	"errors"
	"fmt"

	"github.com/nynrathod/email-queue/config"
	"golang.org/x/oauth2"
)

type OAuthService struct {
	repo *TokenRepository
}

func NewOAuthService(repo *TokenRepository) *OAuthService {
	return &OAuthService{repo: repo}
}

// GetAuthURL generates the OAuth login URL
func (s *OAuthService) GetAuthURL(provider, redirectURL string) (string, error) {
	if redirectURL == "" {
		return "", errors.New("missing redirect URL")
	}

	var authURL string
	switch provider {
	case "google":
		authURL = config.GetGoogleOAuthConfig().AuthCodeURL(redirectURL, oauth2.AccessTypeOffline)
	case "microsoft":
		authURL = config.GetMicrosoftOAuthConfig().AuthCodeURL(redirectURL, oauth2.AccessTypeOffline)
	default:
		return "", errors.New("unsupported provider")
	}

	fmt.Println("Generated auth URL for:", provider)
	return authURL, nil
}

// ExchangeCode handles token exchange and DB save
func (s *OAuthService) ExchangeCode(provider, code, userID, tenantID string) (*oauth2.Token, error) {
	if code == "" {
		return nil, errors.New("missing auth code")
	}

	var (
		token *oauth2.Token
		email string
		err   error
	)

	switch provider {
	case "google":
		token, err = config.GetGoogleOAuthConfig().Exchange(context.Background(), code)
		if err != nil {
			return nil, err
		}

		email, err = s.fetchGoogleEmail(token.AccessToken)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch user email: %w", err)
		}

	case "microsoft":
		token, err = config.GetMicrosoftOAuthConfig().Exchange(context.Background(), code)
		if err != nil {
			return nil, err
		}

		email, err = s.fetchMicrosoftEmail(token.AccessToken)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch user email: %w", err)
		}

	default:
		return nil, errors.New("unsupported provider")
	}

	fmt.Println("Fetched email:", email)
	fmt.Println("Access token:", token.AccessToken)
	fmt.Println("Refresh token:", token.RefreshToken)
	fmt.Println("Token expiry:", token.Expiry)

	err = s.repo.SaveOrUpdateToken(userID, tenantID, provider, token.AccessToken, token.RefreshToken, token.Expiry, email)
	if err != nil {
		return nil, err
	}

	fmt.Println("Token saved for:", provider)
	return token, nil
}
