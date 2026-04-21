# Backend TODO: Messaging + User Profile & Activity

## Scope Summary

Your assigned UI pages map to these backend responsibilities:

- `User Profile & Activity Page` -> required
- `Messaging / Chat Page` -> optional bonus

Based on the project brief and current repo docs, your backend work should focus on exposing the data those pages need through GraphQL, making sure each microservice owns its data, and publishing Kafka events only when data changes.

## Priority Order

1. Finish `User Profile & Activity` backend first because it is part of the core required system.
2. Make sure `connections` and `study sessions` data can be fetched cleanly for the activity section.
3. Implement `Messaging` only after the required profile/activity flow is working end-to-end.
4. If Messaging is skipped, make sure contact info fallback is available through the existing services.

## What The Docs Already Tell Us

- User Service owns basic profile info and contact info.
- Profile & Preferences Service owns courses, topics, and study preferences.
- Matching Service owns buddy requests, accepted connections, and match results.
- Study Session Service owns created/joined sessions and participants.
- Messaging is optional and should support sending messages, storing conversation history, and retrieving previous messages.
- The GraphQL Gateway should aggregate service APIs for the frontend.

## What The Figma Adds

The Figma screens make the backend requirements more specific than the brief alone.

### Profile screen needs these exact data groups

- profile header: avatar, full name, email/username, bio/about text
- academic summary: university, academic year, major
- shared courses card: course name, course code, optionally semester/term
- study topics card: list of topic tags
- study preferences card: session type, preferred times, session length, study style
- past study sessions card: session title/topic, date, duration, place/platform, participant count
- connected study buddies card: buddy name, avatar, sessions together count, shared course tags

### Messaging screen needs these exact data groups

- conversation list: other user name, avatar, last message preview, last message time, unread count
- selected chat header: other user name and optional online/connection status
- message thread: sender, content, timestamp
- message composer: send message mutation
- conversation search: either backend search or frontend filtering on fetched conversations

This means your backend should not only expose generic entities, but also provide response shapes that map cleanly to these cards and lists.

## 1. User Profile & Activity Page: Required Backend Work

### What this page needs from the backend

The page should be able to show:

- basic user info
- avatar and bio
- editable profile fields
- study preferences
- courses and topics
- accepted study buddies / connections
- past study sessions
- optionally upcoming sessions too

### Service Ownership

#### User Service

Own and expose:

- user id
- name
- email
- avatar url or avatar reference
- bio/about
- university
- academic year
- major
- phone or contact info

TODO:

- [ ] Add a query like `me` or `getUserProfile(userId)`
- [ ] Add a mutation like `updateUserProfile(input)`
- [ ] Enforce owner-only updates using JWT auth
- [ ] Return contact info because it is also the fallback if Messaging is not built
- [ ] Support fields used by the profile header card: `avatar`, `bio`, `major`

#### Profile & Preferences Service

Own and expose:

- courses
- study topics
- pace
- mode
- group size
- style
- preferred times
- session length preference if your Figma uses it as a preference

TODO:

- [ ] Add a query like `getPreferences(userId)`
- [ ] Add a query like `getCoursesAndTopics(userId)`
- [ ] Add a mutation like `updatePreferences(userId, input)`
- [ ] Add mutations for course/topic management if not already available
- [ ] Publish `UserPreferencesUpdated` after changes

#### Matching Service

Own and expose:

- accepted connections
- incoming/outgoing buddy requests if the page shows them
- buddy summary info for the connected buddies grid
- sessions together count if shown in the Figma card

TODO:

- [ ] Add a query like `getUserConnections(userId)`
- [ ] Optionally add `getBuddyRequests(userId)` if the page needs pending requests too
- [ ] Make sure accepted connections are clearly distinguishable from recommendations
- [ ] Return enough info for buddy cards: `name`, `avatar`, `sharedCourses`, `sessionsTogether`

#### Study Session Service

Own and expose:

- sessions the user created
- sessions the user joined
- past sessions
- upcoming sessions
- session metadata shown in profile activity cards

TODO:

- [ ] Add a query like `getUserSessions(userId, filter)`
- [ ] Return both created and joined sessions
- [ ] Support filtering by `PAST`, `UPCOMING`, or `ALL`
- [ ] Include key fields needed by the UI: topic, date, duration, type, participants
- [ ] Include location/platform label if the UI shows `Zoom`, study room, or another venue
- [ ] Include participant count because the Figma session cards display it

#### GraphQL Gateway

This page will need data from multiple services, so the gateway should combine them cleanly.

TODO:

- [ ] Expose separate queries for each section, or
- [ ] Add one aggregated query like `getProfileActivity(userId)`
- [ ] Normalize auth so the frontend can fetch page data with one logged-in user context

Recommended approach:

- Start with separate queries because they are easier to debug.
- Add an aggregated query only if the frontend needs a single request.

### Suggested Minimal GraphQL Shape

```graphql
type UserProfile {
  id: ID!
  name: String!
  email: String!
  avatar: String
  bio: String
  university: String
  academicYear: String
  major: String
  phone: String
}

type StudyPreferences {
  pace: String
  mode: String
  groupSize: String
  style: String
  preferredTimes: [String!]!
  sessionLength: String
  courses: [String!]!
  topics: [String!]!
}

type UserConnection {
  userId: ID!
  name: String!
  avatar: String
  status: String!
  sharedCourses: [String!]!
  sessionsTogether: Int!
}

type UserSessionSummary {
  id: ID!
  topic: String!
  sessionDate: String!
  durationMin: Int!
  type: String!
  locationLabel: String
  participantCount: Int!
}
```

Suggested queries and mutations:

```graphql
query {
  me { id name email university academicYear phone }
}

query {
  getPreferences(userId: "USER_ID") {
    pace
    mode
    groupSize
    style
    courses
    topics
  }
}

query {
  getUserConnections(userId: "USER_ID") {
    userId
    name
    status
  }
}

query {
  getUserSessions(userId: "USER_ID", filter: PAST) {
    id
    topic
    sessionDate
    durationMin
    type
  }
}

mutation {
  updateUserProfile(input: {
    name: "Sara Ahmed"
    university: "GIU"
    academicYear: "Year 2"
    phone: "+20123456789"
  }) {
    id
    name
  }
}
```

### Acceptance Checklist For This Page

- [ ] Logged-in user can fetch their profile data
- [ ] Logged-in user can edit their own basic info
- [ ] Profile response includes all fields needed by the Figma header section
- [ ] Logged-in user can fetch and update study preferences
- [ ] Logged-in user can see accepted connections
- [ ] Logged-in user can see past sessions
- [ ] Connections response includes data for the connected buddies cards
- [ ] Sessions response includes data for the past sessions cards
- [ ] Owner-only authorization is enforced on edits
- [ ] Preference updates publish Kafka events

## 2. Messaging / Chat Page: Optional Bonus Backend Work

### Build the smallest valid version first

Do not overbuild this feature. The brief only requires:

- sending messages between matched users
- storing conversation history
- retrieving previous messages

That means the minimal backend should be:

- one-to-one chat only
- text messages only
- matched or connected users only
- persistent message history
- conversation list summaries for the sidebar
- unread count support

Avoid these unless the team has extra time:

- attachments
- typing indicators
- read receipts
- voice notes
- group chat
- websocket/subscription complexity

Polling with normal GraphQL queries is enough for milestone scope.

### Messaging Service Data Model

Suggested tables/entities:

- `Conversation`
- `ConversationParticipant`
- `Message`

Suggested minimum fields:

- `Conversation`: `id`, `createdAt`, `updatedAt`
- `ConversationParticipant`: `conversationId`, `userId`
- `Message`: `id`, `conversationId`, `senderId`, `content`, `createdAt`

TODO:

- [ ] Create Prisma schema for conversations and messages
- [ ] Add indexes for `conversationId` and timestamps
- [ ] Make sure only participants can read/send messages
- [ ] Store a per-user unread state or last-read marker if you want the unread badge in the sidebar

### Messaging Service API

TODO:

- [ ] Add `getMyConversations(userId)`
- [ ] Add `getConversationMessages(conversationId, cursor, limit)`
- [ ] Add `createConversation(otherUserId)` or auto-create on first message
- [ ] Add `sendMessage(conversationId, content)`
- [ ] Add `markConversationRead(conversationId)` if you want unread badges to work properly
- [ ] Optionally support `search` in `getMyConversations(search: String)`

Suggested GraphQL shape:

```graphql
type Conversation {
  id: ID!
  participants: [UserProfile!]!
  lastMessagePreview: String
  lastMessageAt: String
  unreadCount: Int!
  otherUserName: String!
  otherUserAvatar: String
  otherUserStatus: String
  updatedAt: String!
}

type Message {
  id: ID!
  conversationId: ID!
  senderId: ID!
  content: String!
  createdAt: String!
}
```

Suggested chat queries and mutations for the Figma:

```graphql
query {
  getMyConversations {
    id
    otherUserName
    otherUserAvatar
    otherUserStatus
    lastMessagePreview
    lastMessageAt
    unreadCount
  }
}

query {
  getConversationMessages(conversationId: "CONV_ID", limit: 30) {
    id
    senderId
    content
    createdAt
  }
}

mutation {
  sendMessage(conversationId: "CONV_ID", content: "Hello, are you free tomorrow?") {
    id
    content
    createdAt
  }
}
```

### Matching Service Integration

Chat should not be open to random users. It should only work for users who are already connected or accepted as buddies.

TODO:

- [ ] Decide what event means a connection is valid for chat
- [ ] Reuse accepted buddy connection data from Matching Service
- [ ] Block conversation creation if users are not connected

Suggested event names:

- `BuddyRequestAccepted`
- `ConnectionAccepted`

### Notification Service Integration

This is optional but useful.

TODO:

- [ ] Publish `MessageSent`
- [ ] Let Notification Service consume it and create a notification

### Acceptance Checklist For Messaging

- [ ] Connected users can create or access a conversation
- [ ] Conversation list returns preview text, timestamps, and unread counts for the sidebar
- [ ] Users can send messages
- [ ] Old messages are stored and returned in order
- [ ] Unauthorized users cannot open someone else's conversation
- [ ] Messages include timestamps
- [ ] Chat header can show the other user's basic identity data

## 3. Fallback Plan If Messaging Is Not Implemented

The project brief allows communication through contact info when Messaging is skipped.

TODO:

- [ ] Make sure User Service returns contact info safely
- [ ] Make sure Study Session Service returns creator contact info when needed
- [ ] Document clearly in the README or API docs that Messaging is intentionally skipped as an optional feature

## 4. Recommended Implementation Order

### Phase 1: Required Page Data

- [ ] Implement `me` / profile query in User Service
- [ ] Implement `updateUserProfile`
- [ ] Implement preferences read/update queries in Profile Service
- [ ] Implement user sessions query in Study Session Service
- [ ] Implement connections query in Matching Service
- [ ] Expose them through the GraphQL Gateway

### Phase 2: Integration

- [ ] Verify JWT auth works across all profile-related mutations
- [ ] Verify Kafka event publishing for preference changes
- [ ] Verify the frontend can fetch all page data without service contract mismatch

### Phase 3: Optional Messaging

- [ ] Add Messaging Prisma schema
- [ ] Add messaging queries and mutations
- [ ] Add conversation summary fields for the sidebar
- [ ] Add unread count / mark-as-read support if matching the Figma closely
- [ ] Restrict chat to accepted buddies
- [ ] Add optional message notifications

## 5. Testing Checklist

### User Profile & Activity

- [ ] User can fetch their own profile
- [ ] User cannot update another user's profile
- [ ] Profile query returns avatar, bio, major, and academic info used in the Figma
- [ ] User can update preferences successfully
- [ ] Preference update triggers Kafka event
- [ ] Past sessions query returns only relevant sessions
- [ ] Past sessions query includes participant count and location/platform label
- [ ] Connections query returns accepted connections correctly
- [ ] Connections query includes `sharedCourses` and `sessionsTogether` for the buddy cards

### Messaging

- [ ] Non-connected users cannot start a chat
- [ ] Connected users can send and fetch messages
- [ ] Message history persists after refresh
- [ ] Messages are returned in correct order
- [ ] Conversation list returns unread counts and latest message preview

## 6. Figma-Aligned Backend Contract

If you want your backend to fit the designs with minimal frontend workaround, target these contract shapes.

### Profile page contract

```graphql
query {
  getProfileActivity(userId: "USER_ID") {
    profile {
      id
      name
      email
      avatar
      bio
      university
      academicYear
      major
      phone
    }
    preferences {
      mode
      preferredTimes
      sessionLength
      style
      courses
      topics
    }
    pastSessions {
      id
      topic
      sessionDate
      durationMin
      locationLabel
      participantCount
    }
    connections {
      userId
      name
      avatar
      sharedCourses
      sessionsTogether
    }
  }
}
```

### Messaging page contract

```graphql
query {
  getMyConversations {
    id
    otherUserName
    otherUserAvatar
    otherUserStatus
    lastMessagePreview
    lastMessageAt
    unreadCount
  }
}
```

```graphql
query {
  getConversationMessages(conversationId: "CONV_ID", limit: 30) {
    id
    senderId
    content
    createdAt
  }
}
```

## 7. What You Should Tell The Team

- `User Profile & Activity` is not a single-service feature. It is a gateway-level page backed by User, Profile, Matching, and Study Session services.
- `Messaging` should be treated as a bonus microservice and only started after the required profile/activity APIs are stable.
- If Messaging is skipped, contact info fallback must still work because the brief explicitly allows it.

## Final Recommendation

If time is tight, finish this in order:

1. `me` + `updateUserProfile`
2. `getPreferences` + `updatePreferences`
3. `getUserConnections`
4. `getUserSessions`
5. Gateway integration
6. Messaging only if the core flow is already working
