"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeDefs = void 0;
exports.typeDefs = `#graphql
  type AvailabilitySlot {
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
    availabilitySlots: [AvailabilitySlot!]!
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

  type Query {
    getRecommendedMatches(userId: String!, limit: Int): [MatchResult!]!
    getMatchProfile(userId: String!): MatchProfile
  }

  type Mutation {
    recalculateMatches(userId: String!): [MatchResult!]!
  }
`;
