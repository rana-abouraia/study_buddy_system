import { gql } from '@apollo/client';

export const GET_DASHBOARD_DATA = gql`
  query DashboardData($notificationLimit: Int = 5, $matchLimit: Int = 5) {
    getMySessions {
      id
      topic
      date
      duration
      sessionType
      location
      meetingLink
      status
      participants {
        id
        userId
        status
      }
    }
    myNotifications(limit: $notificationLimit) {
      id
      type
      title
      message
      isRead
      createdAt
    }
    getRecommendedMatches(limit: $matchLimit) {
      id
      candidateUserId
      compatibility
      reasons
    }
    getMyBuddies
    meProfile {
      courses {
        id
        name
      }
    }
    getAllUsers {
      id
      firstName
      lastName
      academicYear
    }
  }
`;

export const GET_COURSES_AND_TOPICS = gql`
  query GetCoursesAndTopics($userId: ID!) {
    getCoursesAndTopics(userId: $userId) {
      courses {
        id
        name
      }
    }
  }
`;

export const GET_MATCH_PROFILE = gql`
  query GetMatchProfile($userId: String) {
    getMatchProfile(userId: $userId) {
      userId
      studyPace
      studyMode
      groupSize
      studyStyle
      availabilitySlots {
        id
        dayOfWeek
        startTime
        endTime
      }
    }
  }
`;

export const GET_FIND_BUDDIES_DATA = gql`
  query FindBuddiesData($matchLimit: Int = 12) {
    getRecommendedMatches(limit: $matchLimit) {
      id
      candidateUserId
      compatibility
      reasons
    }
    getIncomingBuddyRequests {
      id
      senderId
      receiverId
      status
      createdAt
      updatedAt
    }
    getOutgoingBuddyRequests {
      id
      senderId
      receiverId
      status
      createdAt
      updatedAt
    }
    getMyBuddies
    meProfile {
      courses {
        id
        name
      }
    }
    getAllUsers {
      id
      firstName
      lastName
      university
      academicYear
    }
  }
`;

export const GET_CONNECTIONS_DATA = gql`
  query ConnectionsData {
    getRecommendedMatches(limit: 20) {
      id
      candidateUserId
      compatibility
      reasons
    }
    getIncomingBuddyRequests {
      id
      senderId
      receiverId
      status
      createdAt
      updatedAt
    }
    getOutgoingBuddyRequests {
      id
      senderId
      receiverId
      status
      createdAt
      updatedAt
    }
    getMyBuddies
    meProfile {
      courses {
        id
        name
      }
    }
    getAllUsers {
      id
      firstName
      lastName
      university
      academicYear
    }
  }
`;

export const GET_STUDY_SESSIONS_DATA = gql`
  query StudySessionsData {
    getMySessions {
      id
      creatorId
      topic
      description
      date
      duration
      sessionType
      location
      meetingLink
      status
      participants {
        id
        userId
        status
      }
    }
    getMyBuddies
    getAllUsers {
      id
      firstName
      lastName
      email
      university
      academicYear
    }
  }
`;

export const GET_MESSAGES_PAGE_DATA = gql`
  query MessagesPageData {
    getMyConversations {
      id
      participant1
      participant2
      updatedAt
      messages {
        id
        senderId
        content
        createdAt
      }
    }
    getMyBuddies
    getAllUsers {
      id
      firstName
      lastName
      email
      university
      academicYear
    }
  }
`;

export const GET_CONVERSATION_MESSAGES = gql`
  query ConversationMessages($conversationId: ID!) {
    getMessages(conversationId: $conversationId) {
      id
      conversationId
      senderId
      content
      createdAt
    }
  }
`;

export const GET_MY_AVAILABILITY = gql`
  query GetMyAvailability {
    getMyAvailability {
      id
      dayOfWeek
      startTime
      endTime
      isRecurring
    }
  }
`;

export const ADD_AVAILABILITY_SLOT = gql`
  mutation AddAvailabilitySlot($dayOfWeek: Int!, $startTime: String!, $endTime: String!, $isRecurring: Boolean) {
    addAvailabilitySlot(dayOfWeek: $dayOfWeek, startTime: $startTime, endTime: $endTime, isRecurring: $isRecurring) {
      id
      dayOfWeek
      startTime
      endTime
      isRecurring
    }
  }
`;

export const DELETE_AVAILABILITY_SLOT = gql`
  mutation DeleteAvailabilitySlot($id: ID!) {
    deleteAvailabilitySlot(id: $id)
  }
`;
