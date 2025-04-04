package domain

type EmailRequest struct {
	ToAddress string `json:"toAddress"` // Optional? Then no validation
	TenantID  string `json:"tenant_id" validate:"required"`
	UserID    string `json:"user_id" validate:"required"`
	To        string `json:"to" validate:"required,email"` // This is the actual recipient
	Subject   string `json:"subject" validate:"required"`
	Body      string `json:"body" validate:"required"`
}

type SendEmailEvent = EmailRequest
