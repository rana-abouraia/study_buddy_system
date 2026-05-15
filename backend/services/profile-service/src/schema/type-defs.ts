export const typeDefs = `#graphql
  type Course {
    id: ID!
    name: String!
    code: String!
    term: String
  }

  type Topic {
    id: ID!
    name: String!
  }

  type UserProfile {
    id: ID!
    userId: ID!
    studyPace: String!
    studyMode: String!
    groupSize: String!
    studyStyles: [String!]!
    preferredTimes: [String!]!
    sessionLength: String
    courses: [Course!]!
    topics: [Topic!]!
    createdAt: String!
    updatedAt: String!
  }

  type ProfileSuggestions {
    courses: [Course!]!
    topics: [Topic!]!
  }
  
  input UpdatePreferencesInput {
    studyPace: String!
    studyMode: String!
    groupSize: String!
    studyStyles: [String!]!
    preferredTimes: [String!]!
    sessionLength: String
  }

  input CourseInput {
    name: String!
    code: String!
    term: String
  }

  input TopicInput {
    name: String!
  }

  type Query {
    getProfile(userId: ID!): UserProfile
    getPreferences(userId: ID!): UserProfile
    getCoursesAndTopics(userId: ID!): UserProfile
    meProfile: UserProfile
    getProfileSuggestions: ProfileSuggestions
  }

  type Mutation {
    updatePreferences(input: UpdatePreferencesInput!): UserProfile!
    replaceCourses(courses: [CourseInput!]!): UserProfile!
    addCourse(input: CourseInput!): UserProfile!
    removeCourse(courseId: ID!): UserProfile!
    replaceTopics(topics: [TopicInput!]!): UserProfile!
    addTopic(input: TopicInput!): UserProfile!
    removeTopic(topicId: ID!): UserProfile!
  }
`;
