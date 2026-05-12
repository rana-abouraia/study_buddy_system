// ─── Auth ────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  firstName: string;   // ← was "name"
  lastName: string;    // ← new
  university?: string;
  academicYear?: string;
}

export interface AuthPayload {
  token: string;
  user: User;
}

// ─── Register Input ──────────────────────────────────────
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  university: string;
  academicYear: string;
}

// ─── Login Input ─────────────────────────────────────────
export interface LoginInput {
  email: string;
  password: string;
}

// ─── Profile & Preferences ───────────────────────────────
export interface StudyPreferences {
  studyPace: 'slow' | 'moderate' | 'fast';
  studyMode: 'online' | 'in-person' | 'both';
  groupSize: 'solo' | 'pair' | 'small' | 'large';
  studyStyle: 'notes' | 'listening' | 'discussing' | 'quiet' | 'other';
}

export interface Course {
  id: string;
  name: string;
  code: string;
}

// ─── Matching ────────────────────────────────────────────
export interface StudyBuddy {
  id: string;
  name: string;
  university: string;
  academicYear: string;
  compatibilityScore: number;
  sharedCourses: Course[];
  studyPreferences: StudyPreferences;
}

// ─── Study Sessions ──────────────────────────────────────
export type SessionType = 'online' | 'in-person';

export interface StudySession {
  id: string;
  topic: string;
  date: string;
  time: string;
  duration: number;
  sessionType: SessionType;
  creatorId: string;
  participants: User[];
}

// ─── Notifications ───────────────────────────────────────
export type NotificationType =
  | 'MATCH_FOUND'
  | 'BUDDY_REQUEST'
  | 'SESSION_INVITE'
  | 'SESSION_REMINDER';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: string;
}

// Shared page / GraphQL data shapes
export type MatchFilter = 'all' | 'high' | 'shared' | 'available';
export type ConnectionsTabKey = 'incoming' | 'outgoing' | 'buddies';

export interface CourseItem {
  id: string;
  name: string;
  code?: string;
  term?: string | null;
}

export interface TopicItem {
  id?: string;
  name: string;
}

export interface UserSummary {
  id: string;
  email?: string;
  firstName: string;
  lastName: string;
  university?: string;
  academicYear?: string;
}

export interface MatchResult {
  id: string;
  candidateUserId: string;
  compatibility: number;
  reasons: string[];
}

export interface BuddyRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchAvailabilitySlot {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

export interface MatchProfileSummary {
  userId: string;
  studyPace?: string | null;
  studyMode?: string | null;
  groupSize?: number | string | null;
  studyStyle?: string | null;
  availabilitySlots: MatchAvailabilitySlot[];
}

export interface UserProfileSummary {
  studyPace?: string | null;
  studyMode?: string | null;
  groupSize?: string | null;
  studyStyles?: string[];
  preferredTimes?: string[];
  sessionLength?: string | null;
  courses: CourseItem[];
  topics: TopicItem[];
}

export interface FindBuddiesData {
  getRecommendedMatches: MatchResult[];
  getIncomingBuddyRequests: BuddyRequest[];
  getOutgoingBuddyRequests: BuddyRequest[];
  getMyBuddies: string[];
  meProfile?: {
    courses: CourseItem[];
  };
  getAllUsers: UserSummary[];
}

export interface ConnectionsData {
  getRecommendedMatches: MatchResult[];
  getIncomingBuddyRequests: BuddyRequest[];
  getOutgoingBuddyRequests: BuddyRequest[];
  getMyBuddies: string[];
  meProfile?: {
    courses: CourseItem[];
  };
  getAllUsers: UserSummary[];
}

export interface DashboardSessionParticipant {
  id: string;
  userId: string;
  status: string;
}

export interface DashboardSession {
  id: string;
  topic: string;
  date: string;
  duration: number;
  sessionType: string;
  location?: string;
  meetingLink?: string;
  status: string;
  participants: DashboardSessionParticipant[];
}

export interface DashboardNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardData {
  getMySessions: DashboardSession[];
  myNotifications: DashboardNotification[];
  unreadNotificationsCount: number;
  getRecommendedMatches: MatchResult[];
  getMyBuddies: string[];
  meProfile?: {
    courses: CourseItem[];
  };
  getAllUsers: UserSummary[];
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsData {
  myNotifications: AppNotification[];
  unreadNotificationsCount: number;
  getMyBuddies: string[];
  getAllUsers: UserSummary[];
}

export interface NotificationBadgeData {
  myNotifications: AppNotification[];
  getMyBuddies: string[];
  getAllUsers: UserSummary[];
  unreadNotificationsCount: number;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface ConversationItem {
  id: string;
  participant1: string;
  participant2: string;
  updatedAt: string;
  messages?: MessageItem[];
}

export interface MessagesPageData {
  getMyConversations: ConversationItem[];
  getMyBuddies: string[];
  getAllUsers: UserSummary[];
}

export interface ConversationMessagesData {
  getMessages: MessageItem[];
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  userId: string;
  status: string;
  joinedAt?: string;
}

export interface StudySessionItem {
  id: string;
  creatorId: string;
  topic: string;
  description?: string | null;
  date: string;
  duration: number;
  sessionType: string;
  location?: string | null;
  meetingLink?: string | null;
  status: string;
  participants: SessionParticipant[];
}

export interface StudySessionsData {
  getMySessions: StudySessionItem[];
  getAllSessions: StudySessionItem[];
  getMyBuddies: string[];
  getAllUsers: UserSummary[];
}

export interface TopicSuggestionsData {
  getProfileSuggestions?: {
    topics: Array<{ id: string; name: string }>;
  };
}

export interface ProfileCourse {
  id?: string;
  name: string;
  code: string;
  term?: string | null;
}

export interface ProfileTopic {
  id?: string;
  name: string;
}

export interface ProfileData {
  studyPace?: string;
  studyMode?: string;
  groupSize?: string;
  studyStyles?: string[];
  preferredTimes?: string[];
  sessionLength?: string | null;
  courses?: ProfileCourse[];
  topics?: ProfileTopic[];
}

export interface AvailabilitySlot {
  id: string;
  dayOfWeek: number | string;
  startTime: string;
  endTime: string;
}

export interface ProfileStudySession {
  id: string;
  creatorId?: string;
  topic: string;
  date: string;
  duration: number;
  location?: string | null;
  sessionType: string;
  participants?: Array<{ userId: string }>;
}

export interface LoginFormState {
  email: string;
  password: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export interface RegisterFormState {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  university: string;
  academicYear: string;
}

export interface RegisterFormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  university?: string;
  academicYear?: string;
  general?: string;
}

export type PreferencePace = 'SLOW' | 'MODERATE' | 'FAST';
export type PreferenceMode = 'ONLINE' | 'IN_PERSON' | 'BOTH';
export type PreferenceSize = 'ONE_ON_ONE' | 'SMALL' | 'LARGE';
export type PreferenceStyle = 'WRITING' | 'DISCUSSION' | 'LISTENING' | 'QUIET';
export type PreferenceTime = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
export type PreferenceLength = '30 minutes' | '1 hour' | '2 hours' | '3+ hours';

export interface LocalCourse {
  name: string;
  code: string;
  term?: string;
  id?: string;
}

