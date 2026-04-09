export const typeDefs = `#graphql
  type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    university: String!
    academicYear: String!
    token: String
  }

  input RegisterInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
    university: String!
    academicYear: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  type Query {
    getUser(id: ID!): User
    getAllUsers: [User]
    me: User
  }

  type Mutation {
    register(input: RegisterInput!): User
    login(input: LoginInput!): String
  }
`;