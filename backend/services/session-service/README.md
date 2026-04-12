# Session Service

This service manages study session scheduling for the StudyMatch platform.

Current capabilities:
- create study sessions
- join existing sessions
- leave sessions
- cancel sessions
- publish simple Kafka events for session changes

## Required environment variables

- `DATABASE_URL`: PostgreSQL connection string for this service database
- `PORT`: service port, defaults to `4005`
- `NODE_ENV`: environment name, usually `development`
- `KAFKA_BROKER`: Kafka broker address, usually `localhost:9092`
- `JWT_SECRET`: JWT secret used for bearer token parsing

## Install and run

```bash
npm install
npx prisma generate
npm run dev
```

## Default port

The default local port is `4005`.

## Notes

- Docker files are intentionally not included yet.
- The service is kept environment-based so it can be containerized later without hardcoded local paths.
- If the Prisma schema changes, apply the migration or push the schema before running the service.
