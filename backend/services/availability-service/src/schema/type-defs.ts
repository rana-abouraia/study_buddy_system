export const typeDefs = `#graphql
  type AvailabilitySlot {
    id: ID!
    userId: String!
    dayOfWeek: Int!
    startTime: String!
    endTime: String!
    isRecurring: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    getMyAvailability: [AvailabilitySlot!]!
    getUserAvailability(userId: String!): [AvailabilitySlot!]!
  }

  type Mutation {
    addAvailabilitySlot(
      dayOfWeek: Int!
      startTime: String!
      endTime: String!
      isRecurring: Boolean
    ): AvailabilitySlot!

    updateAvailabilitySlot(
      id: ID!
      startTime: String
      endTime: String
      isRecurring: Boolean
    ): AvailabilitySlot!

    deleteAvailabilitySlot(id: ID!): Boolean!
  }
`;