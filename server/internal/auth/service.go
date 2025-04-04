package auth

import (
	"context"
	"errors"
	"fmt"

	"github.com/nynrathod/email-queue/config"
	"golang.org/x/oauth2"
)

// OAuthService handles OAuth authentication
type OAuthService struct {
	repo *TokenRepository // Inject repository
}

// NewOAuthService initializes the OAuthService
func NewOAuthService(repo *TokenRepository) *OAuthService {
	return &OAuthService{repo: repo}
}

// GetAuthURL generates login URL for Google or Microsoft
func (s *OAuthService) GetAuthURL(provider, redirectURL string) (string, error) {
	if redirectURL == "" {
		return "", errors.New("missing redirect URL")
	}

	var authURL string
	switch provider {
	case "google":
		authURL = config.GoogleOAuthConfig.AuthCodeURL(redirectURL, oauth2.AccessTypeOffline)
	case "microsoft":
		authURL = config.MicrosoftOAuthConfig.AuthCodeURL(redirectURL, oauth2.AccessTypeOffline)
	default:
		return "", errors.New("unsupported provider")
	}

	return authURL, nil
}

// ExchangeCode exchanges the authorization code for an access token and stores it in DB
func (s *OAuthService) ExchangeCode(provider, code, userID, tenantID string) (*oauth2.Token, error) {
	if code == "" {
		return nil, errors.New("missing auth code")
	}

	var token *oauth2.Token
	var err error

	switch provider {
	case "google":
		token, err = config.GoogleOAuthConfig.Exchange(context.Background(), code)
	case "microsoft":
		token, err = config.MicrosoftOAuthConfig.Exchange(context.Background(), code)
	default:
		return nil, errors.New("unsupported provider")
	}

	if err != nil {
		return nil, err
	}
	fmt.Println("mytoken", token.AccessToken)
	fmt.Println("myreftoken", token.RefreshToken)
	fmt.Println("myrefExpiry", token.Expiry)

	// Store token in DB
	err = s.repo.SaveOrUpdateToken(userID, tenantID, provider, token.AccessToken, token.RefreshToken, token.Expiry)
	if err != nil {
		return nil, err
	}

	return token, nil
}
