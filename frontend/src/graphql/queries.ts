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
