package config

import (
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"golang.org/x/oauth2/microsoft"
)

var GoogleOAuthConfig = &oauth2.Config{
	ClientID:     EnvConfigs.GoogleClientId,
	ClientSecret: EnvConfigs.GoogleClientSEcrete,
	RedirectURL:  "http://localhost:5000/auth/google/callback",
	Scopes: []string{
		"https://www.googleapis.com/auth/userinfo.profile",
		"https://www.googleapis.com/auth/userinfo.email",
		"https://www.googleapis.com/auth/gmail.send", // ✅ Add this scope
	},
	Endpoint: google.Endpoint,
}

var MicrosoftOAuthConfig = &oauth2.Config{
	ClientID:     EnvConfigs.MicrosoftClientId,
	ClientSecret: EnvConfigs.MicrosoftClientSEcrete,
	RedirectURL:  "http://localhost:5000/auth/microsoft/callback",
	Scopes:       []string{"User.Read"},
	Endpoint:     microsoft.AzureADEndpoint("common"),
}
