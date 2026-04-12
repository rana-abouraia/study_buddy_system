export const typeDefs = `#graphql
  type SessionParticipant {
    id: ID!
    sessionId: String!
    userId: String!
    status: String!
    joinedAt: String
  }

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
    contactInfo: String
    status: String!
    participants: [SessionParticipant!]!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    getStudySessions: [StudySession]
    getStudySessionById(id: ID!): StudySession
    getSessionsByCreator(creatorId: String!): [StudySession]
    getSessionsByParticipant(userId: String!): [StudySession]
  }

  type Mutation {
    createStudySession(
      creatorId: String!
      topic: String!
      description: String
      date: String!
      duration: Int!
      sessionType: String!
      location: String
      meetingLink: String
      contactInfo: String
    ): StudySession!

    joinStudySession(
      sessionId: ID!
      userId: String!
    ): StudySession!

    leaveStudySession(
      sessionId: ID!
      userId: String!
    ): StudySession!

    cancelStudySession(
      sessionId: ID!
      userId: String!
    ): StudySession!
  }
`;
