export interface BaseEvent<TPayload> {
  eventName: string;
  timestamp: string;
  producerService: string;
  correlationId: string;
  payload: TPayload;
}

export interface UserPreferencesUpdatedPayload {
  userId: string;
  courses?: Array<{
    id?: string;
    name: string;
    code?: string;
    term?: string | null;
  }>;
  topics?: Array<{
    id?: string;
    name: string;
  }>;
  studyPace?: string | null;
  studyMode?: string | null;
  groupSize?: string | null;
  studyStyles?: string[];
  preferredTimes?: string[];
  sessionLength?: string | null;
}

export interface NormalizedAvailabilitySlot {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

export interface AvailabilityUpdatedPayload {
  userId: string;
  // New snapshot-style payload: full list of current slots
  slots?: Array<{
    id?: string;
    dayOfWeek: number | string;
    startTime: string;
    endTime: string;
    isRecurring?: boolean;
  }>;
  // Legacy per-action fields (kept for back-compat, no longer emitted)
  action?: "ADDED" | "UPDATED" | "DELETED";
  slot?: {
    id?: string;
    userId?: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isRecurring?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
  slotId?: string;
}

export interface ReplaceAvailabilityInput {
  userId: string;
  availability: NormalizedAvailabilitySlot[];
}

export interface UpsertPreferencesInput {
  userId: string;
  courses: string[];
  topics: string[];
  studyPace?: string | null;
  studyMode?: string | null;
  groupSize?: number | null;
  studyStyle?: string | null;
}

export interface MatchFoundPayload {
  userId: string;
  matchedUserId: string;
  userIds: string[];
  compatibilityScore: number;
  reasons: string[];
}

export interface BuddyRequestReceivedPayload {
  requestId: string;
  senderId: string;
  receiverId: string;
}

export interface BuddyRequestAcceptedPayload {
  requestId: string;
  senderId: string;
  receiverId: string;
  accepterId: string;
  recipientId: string;
}
