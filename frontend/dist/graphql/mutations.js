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
export const UPDATE_USER_MUTATION = gql `
  mutation UpdateUser(
    $firstName: String
    $lastName: String
    $university: String
    $academicYear: String
  ) {
    updateUser(
      firstName: $firstName
      lastName: $lastName
      university: $university
      academicYear: $academicYear
    ) {
      ...UserFields
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
