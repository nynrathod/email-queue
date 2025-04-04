package auth

import (
	"fmt"
	"github.com/gofiber/fiber/v2"
)

type AuthHandler struct {
	service *OAuthService
}

// NewAuthHandler initializes a new handler
func NewAuthHandler(service *OAuthService) *AuthHandler {
	return &AuthHandler{service}
}

// GoogleLogin handles the Google OAuth login URL generation
func (h *AuthHandler) GoogleLogin(c *fiber.Ctx) error {
	var body struct {
		RedirectURL string `json:"redirect_url"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	authURL, err := h.service.GetAuthURL("google", body.RedirectURL)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"auth_url": authURL})
}

// GoogleCallback handles the callback after Google OAuth login
func (h *AuthHandler) GoogleCallback(c *fiber.Ctx) error {
	code := c.Query("code")
	userID := "google_userid"     // Placeholder
	tenantID := "google_tenantid" // Placeholder

	_, err := h.service.ExchangeCode("google", code, userID, tenantID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	redirectURL := c.Query("state", "http://localhost:5173/auth/success")
	return c.Redirect(redirectURL, fiber.StatusFound)
}

// MicrosoftLogin handles the Microsoft OAuth login URL generation
func (h *AuthHandler) MicrosoftLogin(c *fiber.Ctx) error {
	var body struct {
		RedirectURL string `json:"redirect_url"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	authURL, err := h.service.GetAuthURL("microsoft", body.RedirectURL)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"auth_url": authURL})
}

// MicrosoftCallback handles the callback after Microsoft OAuth login
func (h *AuthHandler) MicrosoftCallback(c *fiber.Ctx) error {
	code := c.Query("code")
	userID := "microsoft_userid"     // Placeholder
	tenantID := "microsoft_tenantid" // Placeholder

	token, err := h.service.ExchangeCode("microsoft", code, userID, tenantID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	fmt.Println("Microsoft Auth Token:", token.AccessToken)
	redirectURL := c.Query("state", "http://localhost:5173/auth/success")
	return c.Redirect(redirectURL, fiber.StatusFound)
}
