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
