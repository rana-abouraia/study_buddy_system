import { gql } from '@apollo/client';
export const GET_MY_NOTIFICATIONS = gql `
  query GetMyNotifications($limit: Int = 20) {
    myNotifications(limit: $limit) {
      id
      type
      title
      message
      isRead
      createdAt
    }
    unreadNotificationsCount
  }
`;
export const GET_DASHBOARD_DATA = gql `
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
      unreadNotificationsCount
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
export const GET_COURSES_AND_TOPICS = gql `
  query GetCoursesAndTopics($userId: ID!) {
    getCoursesAndTopics(userId: $userId) {
      id
      userId
      studyPace
      studyMode
      groupSize
      studyStyles
      preferredTimes
      sessionLength
      courses {
        id
        name
        code
        term
      }
      topics {
        id
        name
      }
    }
  }
`;
export const GET_MATCH_PROFILE = gql `
  query GetMatchProfile($userId: String!) {
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
export const UPDATE_MATCHING_SERVICE_PROFILE = gql `
  mutation UpdateMatchingProfile($input: UpdateMatchProfileInput!) {
    updateMatchProfile(input: $input) {
      userId
      studyPace
      studyMode
      groupSize
      studyStyle
    }
  }
`;
export const RECALCULATE_MATCHES = gql `
  mutation RecalculateMatches {
    recalculateMatches {
      id
      userId
      candidateUserId
      compatibility
      reasons
    }
  }
`;
export const GET_FIND_BUDDIES_DATA = gql `
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
export const GET_CONNECTIONS_DATA = gql `
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
export const GET_STUDY_SESSIONS_DATA = gql `
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
export const GET_MESSAGES_PAGE_DATA = gql `
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
export const GET_CONVERSATION_MESSAGES = gql `
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
export const GET_MY_AVAILABILITY = gql `
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
export const ADD_AVAILABILITY_SLOT = gql `
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
export const DELETE_AVAILABILITY_SLOT = gql `
  mutation DeleteAvailabilitySlot($id: ID!) {
    deleteAvailabilitySlot(id: $id)
  }
`;
// ==================== PROFILE SERVICE MUTATIONS ====================
export const UPDATE_MATCH_PROFILE = gql `
  mutation UpdatePreferences($input: UpdatePreferencesInput!) {
    updatePreferences(input: $input) {
      id
      userId
      studyPace
      studyMode
      groupSize
      studyStyles
      preferredTimes
      sessionLength
      courses {
        id
        name
        code
        term
      }
      topics {
        id
        name
      }
    }
  }
`;
export const ADD_COURSE = gql `
  mutation AddCourse($input: CourseInput!) {
    addCourse(input: $input) {
      courses {
        id
        name
        code
        term
      }
      topics {
        id
        name
      }
    }
  }
`;
export const REPLACE_COURSES = gql `
  mutation ReplaceCourses($courses: [CourseInput!]!) {
    replaceCourses(courses: $courses) {
      courses {
        id
        name
        code
        term
      }
      topics {
        id
        name
      }
    }
  }
`;
export const REMOVE_COURSE = gql `
  mutation RemoveCourse($courseId: ID!) {
    removeCourse(courseId: $courseId) {
      courses {
        id
        name
        code
        term
      }
      topics {
        id
        name
      }
    }
  }
`;
export const ADD_TOPIC = gql `
  mutation AddTopic($input: TopicInput!) {
    addTopic(input: $input) {
      courses {
        id
        name
        code
        term
      }
      topics {
        id
        name
      }
    }
  }
`;
export const REPLACE_TOPICS = gql `
  mutation ReplaceTopics($topics: [TopicInput!]!) {
    replaceTopics(topics: $topics) {
      courses {
        id
        name
        code
        term
      }
      topics {
        id
        name
      }
    }
  }
`;
export const REMOVE_TOPIC = gql `
  mutation RemoveTopic($topicId: ID!) {
    removeTopic(topicId: $topicId) {
      courses {
        id
        name
        code
        term
      }
      topics {
        id
        name
      }
    }
  }
`;
