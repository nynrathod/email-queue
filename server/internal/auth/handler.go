package auth

import (
	"github.com/gofiber/fiber/v2"
)

type AuthHandler struct {
	service *OAuthService
}

// NewAuthHandler initializes a new handler
func NewAuthHandler(service *OAuthService) *AuthHandler {
	return &AuthHandler{service}
}

// Google Login Handler
func (h *AuthHandler) GoogleLogin(c *fiber.Ctx) error {
	var body struct {
		RedirectURL string `json:"redirect_url"`
	}

	// ✅ Parse JSON body
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// ✅ Generate OAuth URL
	authURL, err := h.service.GetAuthURL("google", body.RedirectURL)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	// ✅ Return auth URL
	return c.JSON(fiber.Map{"auth_url": authURL})
}

// Google Callback Handler
func (h *AuthHandler) GoogleCallback(c *fiber.Ctx) error {
	code := c.Query("code")
	userID := "test_user_123"     // Hardcoded for now, will be dynamic later
	tenantID := "test_tenant_123" // Hardcoded for now

	_, err := h.service.ExchangeCode("google", code, userID, tenantID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	redirectURL := c.Query("state", "http://localhost:5173/auth/success")
	return c.Redirect(redirectURL, fiber.StatusFound)
}

// Microsoft Login Handler
func (h *AuthHandler) MicrosoftLogin(c *fiber.Ctx) error {
	redirectURL := c.Query("redirect_url")
	authURL, err := h.service.GetAuthURL("microsoft", redirectURL)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"auth_url": authURL})
}

// Microsoft Callback Handler
// func (h *AuthHandler) MicrosoftCallback(c *fiber.Ctx) error {
// 	code := c.Query("code")
// 	token, err := h.service.ExchangeCode("microsoft", code)
// 	if err != nil {
// 		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
// 	}

// 	log.Println("Microsoft Auth Token:", token.AccessToken)
// 	redirectURL := c.Query("state", "http://localhost:5173/auth/success")
// 	return c.Redirect(redirectURL, fiber.StatusFound)
// }
