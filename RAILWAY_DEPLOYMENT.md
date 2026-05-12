# Railway Deployment Notes

Deploy this monorepo as separate Railway services. Set each Railway service root directory to the folder for that app or microservice.

## Services

- `frontend`
- `backend/api-gateway`
- `backend/services/user-service`
- `backend/services/profile-service`
- `backend/services/availability-service`
- `backend/services/matching-service`
- `backend/services/session-service`
- `backend/services/notification-service`
- `backend/services/messaging-service`

## Backend Variables

Every backend service needs:

- `DATABASE_URL`
- `JWT_SECRET`
- Kafka connection variable:
  - most services: `KAFKA_BROKER`
  - matching service: `KAFKA_BROKERS` or `KAFKA_BROKER`

The API gateway needs:

- `JWT_SECRET`
- `USER_SERVICE_URL`
- `PROFILE_SERVICE_URL`
- `AVAILABILITY_SERVICE_URL`
- `MATCHING_SERVICE_URL`
- `SESSION_SERVICE_URL`
- `NOTIFICATION_SERVICE_URL`
- `MESSAGING_SERVICE_URL`

Use each deployed Railway service URL plus `/graphql`, for example:

```text
USER_SERVICE_URL=https://your-user-service.up.railway.app/graphql
```

## Frontend Variable

Set this before building the frontend:

```text
VITE_GRAPHQL_URL=https://your-api-gateway.up.railway.app/graphql
```

## Docker

Each deployable app has a `Dockerfile`. For local backend Docker Compose, use:

```sh
cd backend
docker compose --env-file .env up --build
```

The frontend Docker image builds static assets with Vite and serves them through nginx.
