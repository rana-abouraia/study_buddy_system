export const typeDefs = `#graphql
  type MatchAvailabilitySlot {
    id: ID!
    dayOfWeek: String!
    startTime: String!
    endTime: String!
  }

  type MatchProfile {
    id: ID!
    userId: String!
    courses: [String!]!
    topics: [String!]!
    studyPace: String
    studyMode: String
    groupSize: Int
    studyStyle: String
    availabilitySlots: [MatchAvailabilitySlot!]!
    createdAt: String!
    updatedAt: String!
  }

  type MatchResult {
    id: ID!
    userId: String!
    candidateUserId: String!
    compatibility: Float!
    reasons: [String!]!
    createdAt: String!
    updatedAt: String!
  }

  type BuddyRequest {
    id: ID!
    senderId: String!
    receiverId: String!
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  input UpdateMatchProfileInput {
    studyPace: String
    studyMode: String
    groupSize: Int
    studyStyle: String
    preferredTimes: [String!]
    sessionLength: String
  }

  type Query {
    getRecommendedMatches(userId: String, limit: Int): [MatchResult!]!
    getMatchProfile(userId: String): MatchProfile
    getIncomingBuddyRequests: [BuddyRequest!]!
    getOutgoingBuddyRequests: [BuddyRequest!]!
    getMyBuddies: [String!]!
  }

  type Mutation {
    recalculateMatches(userId: String): [MatchResult!]!
    sendBuddyRequest(receiverId: String!): BuddyRequest!
    acceptBuddyRequest(requestId: String!): BuddyRequest!
    rejectBuddyRequest(requestId: String!): BuddyRequest!
    updateMatchProfile(input: UpdateMatchProfileInput!): MatchProfile!
  }
`;