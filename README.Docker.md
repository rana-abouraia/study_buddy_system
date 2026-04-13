### Building and running the notification service

When you're ready, start your application by running:
`docker compose up --build`.

This starts:
- Kafka on `localhost:9092`
- Notification service on `http://localhost:4006`

Before running it, add a real Neon connection string to:
`backend/services/notification-service/.env`

Minimum `.env`:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@HOST/DBNAME?sslmode=require"
PORT=4006
KAFKA_CLIENT_ID=notification-service
KAFKA_GROUP_ID=notification-service-group
NOTIFICATION_TOPICS=match-found,buddy-request-received,buddy-request-accepted,session-invitation-received,study-session-invitation,session-reminder,study-session-reminder,session-upcoming
```

### Deploying your application to the cloud

First, build your image, e.g.: `docker build -t myapp .`.
If your cloud uses a different CPU architecture than your development
machine (e.g., you are on a Mac M1 and your cloud provider is amd64),
you'll want to build the image for that platform, e.g.:
`docker build --platform=linux/amd64 -t myapp .`.

Then, push it to your registry, e.g. `docker push myregistry.com/myapp`.

Consult Docker's [getting started](https://docs.docker.com/go/get-started-sharing/)
docs for more detail on building and pushing.

### References
* [Docker's Node.js guide](https://docs.docker.com/language/nodejs/)
