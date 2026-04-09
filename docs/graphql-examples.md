# GraphQL Examples

## Register
```graphql
mutation {
  register(input: {
    name: "Sara Ahmed"
    email: "sara@example.com"
    password: "123456"
    university: "GIU"
    academicYear: "Year 2"
    phone: "+20123456789"
  }) {
    token
    user { id name email university academicYear }
  }
}
```

## Update preferences
```graphql
mutation {
  updatePreferences(userId: "USER_ID", input: {
    pace: "Moderate"
    mode: "ONLINE"
    groupSize: "2-3"
    style: "Discussion"
  }) {
    id pace mode groupSize style
  }
}
```

## Add availability
```graphql
mutation {
  addAvailability(userId: "USER_ID", input: {
    dayOfWeek: "MONDAY"
    startTime: "14:00"
    endTime: "16:00"
  }) {
    id dayOfWeek startTime endTime
  }
}
```

## Get recommendations
```graphql
query {
  recommendedBuddies(userId: "USER_ID") {
    userId
    name
    compatibilityScore
    explanation
  }
}
```

## Send buddy request
```graphql
mutation {
  sendBuddyRequest(fromUserId: "USER_A", toUserId: "USER_B") {
    id status
  }
}
```

## Create session
```graphql
mutation {
  createStudySession(input: {
    creatorId: "USER_A"
    topic: "Operating Systems"
    sessionDate: "2026-04-10T12:00:00.000Z"
    durationMin: 90
    type: "ONLINE"
    contactInfo: "sara@example.com"
    participantIds: ["USER_B"]
  }) {
    id topic type sessionDate durationMin
    participants { userId }
  }
}
```
