export const typeDefs = `#graphql
  type Notification {
    id: ID!
    userId: String!
    type: String!
    title: String!
    message: String!
    sourceTopic: String!
    producerService: String
    correlationId: String
    isRead: Boolean!
    readAt: String
    createdAt: String!
    updatedAt: String!
  }

  type MarkAllNotificationsResult {
    count: Int!
  }

  type Query {
    myNotifications(onlyUnread: Boolean = false, limit: Int = 50): [Notification!]!
    notification(id: ID!): Notification
    notificationsByUser(userId: ID!, onlyUnread: Boolean = false, limit: Int = 50): [Notification!]!
    unreadNotificationsCount: Int!
  }

  type Mutation {
    markNotificationAsRead(id: ID!): Notification!
    markAllNotificationsAsRead: MarkAllNotificationsResult!
  }
`;
