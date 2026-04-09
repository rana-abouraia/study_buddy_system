# StudyMatch — Real-Time Study Buddy Matcher

A scalable, event-driven microservices platform that intelligently connects students based on compatibility, availability, and study behavior.

---

## Team

* Rowaida Mokhtar
* Rana Abouraia
* Mohamed Serag
* Mahmoud Hesham
* Mohammed Walid

---

## Overview

StudyMatch is a backend system designed to solve a common academic problem:
Students often struggle to find suitable study partners who match their schedule, pace, and academic needs.

This platform provides:

* Smart study buddy recommendations
* Session scheduling and coordination
* Real-time notifications
* Event-driven communication between services

The system is built using a modern microservices architecture to ensure scalability, modularity, and responsiveness.

---

## Key Features

### Authentication & User Management

* Secure registration and login (JWT)
* Password hashing using bcrypt
* Basic profile management

### Profile & Study Preferences

* Manage courses and study topics
* Define study pace, mode, group size, and style

### Availability Management

* Weekly scheduling system
* Overlap detection and prevention

### Matching Engine

* Compatibility score (0–100)
* Based on:

  * shared courses
  * shared topics
  * study preferences
  * availability overlap

### Study Sessions

* Create, join, and leave sessions
* Support for online and in-person sessions
* Participant management

### Notifications

* Match found alerts
* Buddy requests
* Session invitations and reminders

### Messaging (Optional)

* Chat between matched users
* Conversation history

---

## Architecture

### Microservices Design

```text
Client (Frontend)
        ↓
GraphQL Gateway (Apollo)
        ↓
-------------------------------------------------
| User Service                                  |
| Profile & Preferences Service                 |
| Availability Service                          |
| Matching Service                              |
| Study Session Service                         |
| Notification Service                          |
| Messaging Service (Optional)                  |
-------------------------------------------------
        ↓
Kafka (Event Bus)
        ↓
NeonDB (PostgreSQL per service)
```

---

## Tech Stack

| Layer        | Technology                   |
| ------------ | ---------------------------- |
| Backend      | Node.js, Express             |
| API          | GraphQL (Apollo Gateway)     |
| Database     | NeonDB (PostgreSQL) + Prisma |
| Messaging    | Apache Kafka                 |
| Deployment   | Docker                       |
| Architecture | Microservices                |

---

## Documentation

- Architecture Overview: docs/architecture.md  
- GraphQL Examples: docs/graphql-examples.md  

---

## Event-Driven Communication

The system uses Kafka to enable asynchronous communication between services.

### Example Workflow

```text
User updates availability
        ↓
Availability Service → emits event
        ↓
Matching Service → recalculates matches
        ↓
Matching Service → emits MatchFound
        ↓
Notification Service → notifies user
```

### Event Structure

```json
{
  "eventName": "AvailabilityUpdated",
  "timestamp": "ISO_DATE",
  "producerService": "availability-service",
  "correlationId": "uuid",
  "payload": {}
}
```

---

## GraphQL API

### Sample Query

```graphql
query {
  getRecommendedBuddies {
    id
    name
    compatibilityScore
  }
}
```

### Sample Mutation

```graphql
mutation {
  createStudySession(
    topic: "Databases",
    date: "2026-04-10",
    duration: 2,
    type: "online"
  ) {
    id
  }
}
```

---

## Database Design

Each microservice owns its own database schema to ensure scalability and independence.

### Core Entities

* User
* Profile
* Course
* Topic
* AvailabilitySlot
* Match
* StudySession
* Notification

ORM used: Prisma

---

## Running the Project

### 1. Install dependencies

```bash
npm install
```

### 2. Start infrastructure

```bash
docker-compose up -d
```

### 3. Run services

```bash
cd services/<service-name>
npm run dev
```

### 4. Start GraphQL Gateway

```bash
cd gateway
npm run dev
```

---

## Testing

You can test the system using:

* GraphQL Playground
* Postman (GraphQL requests)

---

## Design Alignment

This backend implementation aligns with the UI/UX design from Milestone 1, ensuring consistency between user interface flows and backend logic.

---

## Notes

* Messaging service is optional (bonus feature)
* Contact information is used if messaging is not implemented
* Matching logic is rule-based and can be extended
* Some features are simplified to fit the milestone scope

---

## Academic Context

Developed as part of:

Software Project II — Spring 2026

This project demonstrates:

* Microservices architecture
* Event-driven systems using Kafka
* GraphQL API design
* Scalable backend development

---

## Why This Project Stands Out

* Clear separation of concerns using microservices
* Real-time architecture with Kafka
* Scalable and modular backend design
* Strong alignment between UI/UX and backend

---

## License

This project is for educational purposes.