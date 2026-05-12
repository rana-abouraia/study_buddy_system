export const typeDefs = `#graphql
  type StudySession {
    id: ID!
    creatorId: String!
    topic: String!
    description: String
    date: String!
    duration: Int!
    sessionType: String!
    location: String
    meetingLink: String
    status: String!
    participants: [SessionParticipant]
    createdAt: String!
    updatedAt: String!
  }

  type SessionParticipant {
    id: ID!
    sessionId: String!
    userId: String!
    status: String!
    joinedAt: String
  }

  type Query {
    getSession(id: ID!): StudySession
    getMySessions: [StudySession]
    getAllSessions: [StudySession]
    getMyInvitations: [SessionParticipant]
  }

  type Mutation {
    createSession(
      topic: String!
      description: String
      date: String!
      duration: Int!
      sessionType: String!
      location: String
      meetingLink: String
      participantIds: [ID!]
    ): StudySession!

    joinSession(sessionId: ID!): SessionParticipant!

    updateSession(
      sessionId: ID!
      topic: String
      description: String
      date: String
      duration: Int
      sessionType: String
      meetingLink: String
      location: String
      participantIds: [ID!]
    ): StudySession!

    leaveSession(sessionId: ID!): Boolean!

    cancelSession(sessionId: ID!): Boolean!

    respondToSessionInvitation(sessionId: ID!, accept: Boolean!): SessionParticipant!
  }
`;
