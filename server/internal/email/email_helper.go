package email

import (
	"strings"
	"time"
)

func SameDay(t1, t2 time.Time) bool {
	y1, m1, d1 := t1.Date()
	y2, m2, d2 := t2.Date()
	return y1 == y2 && m1 == m2 && d1 == d2
}

func GetDailyQuota(linkedAt time.Time) int {
	days := int(time.Since(linkedAt).Hours() / 24)
	switch {
	case days <= 1:
		return 3
	case days <= 3:
		return 50
	case days <= 7:
		return 100
	default:
		return 300
	}
}

var disposableDomains = map[string]bool{
	"mailinator.com":    true,
	"10minutemail.com":  true,
	"tempmail.com":      true,
	"guerrillamail.com": true,
}

func IsDisposableEmail(email string) bool {
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false
	}
	domain := strings.ToLower(parts[1])
	return disposableDomains[domain]
}
