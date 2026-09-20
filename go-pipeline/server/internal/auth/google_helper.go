package auth

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
)

func (s *OAuthService) fetchGoogleEmail(accessToken string) (string, error) {
	req, _ := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	fmt.Println("Fetching email from Google API")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatal("Google API request failed:", err)
	}
	defer res.Body.Close()

	var result struct {
		Email string `json:"email"`
	}

	if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
		log.Fatal("Failed to decode Google response:", err)
	}

	fmt.Println("Fetched Google email:", result.Email)
	return result.Email, nil
}

func (s *OAuthService) fetchMicrosoftEmail(accessToken string) (string, error) {
	req, err := http.NewRequest("GET", "https://graph.microsoft.com/v1.0/me", nil)
	if err != nil {
		log.Fatal("Microsoft request creation failed:", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	fmt.Println("Fetching email from Microsoft Graph API")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatal("Microsoft API request failed:", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return "", errors.New("failed to fetch user data from Microsoft")
	}

	var result struct {
		Mail string `json:"mail"`
	}
	if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
		log.Fatal("Failed to decode Microsoft response:", err)
	}

	fmt.Println("Fetched Microsoft email:", result.Mail)
	return result.Mail, nil
}
