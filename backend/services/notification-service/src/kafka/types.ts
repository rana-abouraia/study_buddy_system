export interface KafkaEventEnvelope {
  eventName?: string;
  timestamp?: string;
  producerService?: string;
  correlationId?: string;
  payload?: Record<string, unknown>;
}

export interface NotificationDraft {
  userId: string;
  type: string;
  title: string;
  message: string;
  sourceTopic: string;
  producerService?: string;
  correlationId?: string;
}
