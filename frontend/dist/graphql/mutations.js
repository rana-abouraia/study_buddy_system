import { gql } from '@apollo/client';
export const MARK_NOTIFICATION_AS_READ = gql `
  mutation MarkNotificationAsRead($id: ID!) {
    markNotificationAsRead(id: $id) {
      id
      isRead
      readAt
    }
  }
`;
const USER_FIELDS = gql `
  fragment UserFields on User {
    id
    email
    firstName
    lastName
    university
    academicYear
  }
`;
export const LOGIN_MUTATION = gql `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        ...UserFields
      }
    }
  }
  ${USER_FIELDS}
`;
export const REGISTER_MUTATION = gql `
  mutation Register(
    $firstName: String!
    $lastName: String!
    $email: String!
    $password: String!
    $university: String!
    $academicYear: String!
    $phone: String
  ) {
    register(
      firstName: $firstName
      lastName: $lastName
      email: $email
      password: $password
      university: $university
      academicYear: $academicYear
      phone: $phone
    ) {
      token
      user {
        ...UserFields
      }
    }
  }
  ${USER_FIELDS}
`;
export const GET_ME = gql `
  query Me {
    me {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;
export const SEND_BUDDY_REQUEST = gql `
  mutation SendBuddyRequest($receiverId: String!) {
    sendBuddyRequest(receiverId: $receiverId) {
      id
      senderId
      receiverId
      status
      createdAt
      updatedAt
    }
  }
`;
export const ACCEPT_BUDDY_REQUEST = gql `
  mutation AcceptBuddyRequest($requestId: String!) {
    acceptBuddyRequest(requestId: $requestId) {
      id
      senderId
      receiverId
      status
      createdAt
      updatedAt
    }
  }
`;
export const REJECT_BUDDY_REQUEST = gql `
  mutation RejectBuddyRequest($requestId: String!) {
    rejectBuddyRequest(requestId: $requestId) {
      id
      senderId
      receiverId
      status
      createdAt
      updatedAt
    }
  }
`;
export const CREATE_STUDY_SESSION = gql `
  mutation CreateStudySession(
    $topic: String!
    $description: String
    $date: String!
    $duration: Int!
    $sessionType: String!
    $location: String
    $meetingLink: String
    $participantIds: [ID!]
  ) {
    createSession(
      topic: $topic
      description: $description
      date: $date
      duration: $duration
      sessionType: $sessionType
      location: $location
      meetingLink: $meetingLink
      participantIds: $participantIds
    ) {
      id
      topic
      date
      duration
      sessionType
      status
      participants {
        id
        userId
        status
      }
    }
  }
`;
export const MARK_ALL_NOTIFICATIONS_AS_READ = gql `
  mutation MarkAllNotificationsAsRead {
    markAllNotificationsAsRead {
      count
    }
  }
`;
export const SEND_MESSAGE = gql `
  mutation SendMessage($receiverId: ID!, $content: String!) {
    sendMessage(receiverId: $receiverId, content: $content) {
      id
      conversationId
      senderId
      content
      createdAt
    }
  }
`;
