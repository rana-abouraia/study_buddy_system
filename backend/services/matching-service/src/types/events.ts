export interface BaseEvent<TPayload> {
  eventName: string;
  timestamp: string;
  producerService: string;
  correlationId: string;
  payload: TPayload;
}

export interface UserCreatedPayload {
  userId: string;
}

export interface UserPreferencesUpdatedPayload {
  userId: string;
  courses: string[];
  topics: string[];
  studyPace?: string | null;
  studyMode?: string | null;
  groupSize?: number | null;
  studyStyle?: string | null;
}

export interface AvailabilitySlotPayload {
  dayOfWeek: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

export interface AvailabilityUpdatedPayload {
  userId: string;
  availability: AvailabilitySlotPayload[];
}

export interface MatchFoundPayload {
  userId: string;
  matchedUserId: string;
  userIds: string[];
  compatibilityScore: number;
  reasons: string[];
}
