package config

import (
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"golang.org/x/oauth2/microsoft"
)

func GetGoogleOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     EnvConfigs.GoogleClientId,
		ClientSecret: EnvConfigs.GoogleClientSecrete,
		RedirectURL:  "http://localhost:5000/auth/google/callback",
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.profile",
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/gmail.send",
		},
		Endpoint: google.Endpoint,
	}
}

func GetMicrosoftOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     EnvConfigs.MicrosoftClientId,
		ClientSecret: EnvConfigs.MicrosoftClientSecrete,
		RedirectURL:  "http://localhost:5000/auth/microsoft/callback",
		Scopes: []string{
			"https://graph.microsoft.com/User.Read",
			"https://graph.microsoft.com/Mail.Send",
			"offline_access",
		},
		Endpoint: microsoft.AzureADEndpoint("common"),
	}
}
