"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeDefs = void 0;
exports.typeDefs = `#graphql
  type Message {
    id: ID!
    conversationId: String!
    senderId: String!
    content: String!
    createdAt: String!
  }

  type Conversation {
    id: ID!
    participant1: String!
    participant2: String!
    messages: [Message]
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    getConversation(otherUserId: ID!): Conversation
    getMyConversations: [Conversation]
    getMessages(conversationId: ID!): [Message]
  }

  type Mutation {
    sendMessage(
      receiverId: ID!
      content: String!
    ): Message!
  }
`;
