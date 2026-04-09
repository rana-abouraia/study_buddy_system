# Architecture Summary

## Why microservices?
The project brief requires a microservices architecture where each service owns one business capability and communicates through Kafka. This repository follows that structure directly.

## Service responsibilities
### User Service
- registration
- login
- JWT generation
- basic profile info
- contact info fallback

### Profile & Preferences Service
- courses
- study topics
- study pace
- mode
- group size
- style

### Availability Service
- add/delete availability slots
- prevent overlaps

### Matching Service
- rule-based matching score
- buddy requests
- accepted connection flow

### Study Session Service
- create sessions
- join sessions
- leave sessions
- participant list

### Notification Service
- consumes Kafka events
- creates readable notifications
- allows mark-as-read

### Gateway
- Apollo GraphQL endpoint for frontend
- aggregates internal service APIs

## Example event-driven flow
1. A user updates preferences.
2. Profile Service publishes `UserPreferencesUpdated`.
3. Matching Service can consume and recalculate matches.
4. Matching Service publishes `MatchFound`.
5. Notification Service consumes `MatchFound` and creates notifications.

## Database-per-service design
Each service has its own Prisma schema and its own `DATABASE_URL`.
This keeps services independent and matches the milestone requirement.
