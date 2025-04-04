package domain

type EmailRequest struct {
	ToAddress string `json:"toAddress"`
	TenantID  string `json:"tenantId"`
	UserID    string `json:"userId"`
	To        string `json:"to"`
	Subject   string `json:"subject"`
	Body      string `json:"body"`
}

type SendEmailEvent = EmailRequest
