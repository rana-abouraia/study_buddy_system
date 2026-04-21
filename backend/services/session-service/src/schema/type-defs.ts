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
    ): StudySession!

    joinSession(sessionId: ID!): SessionParticipant!

    leaveSession(sessionId: ID!): Boolean!

    cancelSession(sessionId: ID!): Boolean!
  }
`;
