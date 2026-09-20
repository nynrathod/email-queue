# Email Queue Service

This service handles sending emails using a queue-based architecture via RabbitMQ. It supports Gmail and Microsoft Outlook through OAuth2 authentication.

## 🔧 Environment Variables

Set the following environment variables before running the service:

### PostgreSQL Configuration

| Variable         | Description               |
|------------------|---------------------------|
| `DB_NAME`         | Name of the PostgreSQL database |
| `DB_HOST`         | PostgreSQL host address |
| `DB_USER`         | Database username |
| `DB_PASSWORD`     | Database password |
| `DB_PORT`         | PostgreSQL port (e.g. 5432) |

### RabbitMQ

| Variable        | Description                  |
|------------------|------------------------------|
| `RABBITMQ_URL`    | Full RabbitMQ connection URL (e.g. `amqp://guest:guest@localhost:5672/`) |

### Google OAuth

| Variable                    | Description                         |
|-----------------------------|-------------------------------------|
| `OAUTH_GOOGLE_CLIENT_ID`     | Google OAuth2 client ID             |
| `OAUTH_GOOGLE_CLIENT_SECRETE` | Google OAuth2 client secret         |

### Microsoft OAuth

| Variable                         | Description                          |
|----------------------------------|--------------------------------------|
| `OAUTH_MICROSOFT_CLIENT_ID`       | Microsoft OAuth2 client ID           |
| `OAUTH_MICROSOFT_CLIENT_SECRETE` | Microsoft OAuth2 client secret       |

> 🔐 **Note:** Keep all secret keys and credentials secure. Use a `.env` file or a secret manager in production environments.

---

## 🚀 Running the App

### Start Backend (Go)

```bash
$ cd server

# Option 1: Using Air (recommended for dev)
air

# Option 2: Using go run
go run main.go
```

### Start Frontend (React)

```bash
$ cd client

npm run dev
```


