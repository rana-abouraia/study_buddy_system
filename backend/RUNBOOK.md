# Runbook

## Install

From `study_buddy_system/backend`:

```powershell
Copy-Item .env.example .env
```

Then edit `.env` and fill in the Neon/Postgres URLs and `JWT_SECRET`.

Install dependencies:

```powershell
$dirs = @(
  'api-gateway',
  'services/user-service',
  'services/profile-service',
  'services/availability-service',
  'services/matching-service',
  'services/session-service',
  'services/notification-service',
  'services/messaging-service'
)
foreach ($dir in $dirs) { Push-Location $dir; npm install; Pop-Location }
```

## Docker Compose

From `study_buddy_system`:

```powershell
docker compose --env-file backend/.env up --build
```

From `study_buddy_system/backend`:

```powershell
docker compose -f docker-compose.yml up --build
```

## Prisma Migrations

From `study_buddy_system/backend`:

```powershell
$services = @(
  'services/user-service',
  'services/profile-service',
  'services/availability-service',
  'services/matching-service',
  'services/session-service',
  'services/notification-service',
  'services/messaging-service'
)
foreach ($service in $services) {
  Push-Location $service
  npx prisma generate
  npx prisma migrate deploy --schema=prisma/schema.prisma
  Pop-Location
}
```

## Start Services Without Docker

Open one terminal per service from `study_buddy_system/backend`:

```powershell
cd services/user-service; npm run dev
cd services/profile-service; npm run dev
cd services/availability-service; npm run dev
cd services/matching-service; npm run dev
cd services/session-service; npm run dev
cd services/notification-service; npm run dev
cd services/messaging-service; npm run dev
cd api-gateway; npm run dev
```

Use the `.env` service URLs as `http://localhost:400x` for manual startup.

## Test GraphQL Through Gateway

Gateway URL:

```text
http://localhost:4000
```

Run the milestone 2 sequence in this order:

1. `register`
2. `updatePreferences`
3. `addAvailabilitySlot`
4. `recalculateMatches`
5. `createSession`
6. `joinSession`
7. `sendMessage`
8. `myNotifications`
