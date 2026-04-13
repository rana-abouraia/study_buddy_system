"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeDefs = void 0;
exports.typeDefs = `#graphql
  type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    bio: String
    avatar: String
    university: String!
    academicYear: String!
    major: String
    phone: String
    isVerified: Boolean!
    createdAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    getUser(id: ID!): User
    getAllUsers: [User]
    me: User
  }

  type Mutation {
    register(
      email: String!
      password: String!
      firstName: String!
      lastName: String!
      university: String!
      academicYear: String!
      phone: String
    ): AuthPayload!

    login(
      email: String!
      password: String!
    ): AuthPayload!

    updateUser(
      firstName: String
      lastName: String
      bio: String
      avatar: String
      university: String
      academicYear: String
      major: String
      phone: String
    ): User!
  }
`;
