import { KafkaEventEnvelope, NotificationDraft } from './types';

const readString = (value: unknown) => {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const readNumber = (value: unknown) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const readStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => readString(item))
    .filter((item): item is string => Boolean(item));
};

const unique = (values: string[]) => [...new Set(values)];

const getRecipients = (payload: Record<string, unknown>) => {
  return unique(
    [
      ...readStringArray(payload.userIds),
      ...readStringArray(payload.recipientIds),
      ...readStringArray(payload.participantIds),
      readString(payload.userId),
      readString(payload.receiverId),
      readString(payload.recipientId),
    ].filter((item): item is string => Boolean(item)),
  );
};

const buildDrafts = (
  recipients: string[],
  common: Omit<NotificationDraft, 'userId'>,
): NotificationDraft[] => {
  return recipients.map((userId) => ({
    userId,
    ...common,
  }));
};

export const mapEventToNotifications = (
  topic: string,
  event: KafkaEventEnvelope,
): NotificationDraft[] => {
  const payload = event.payload;
  const recipients = getRecipients(payload);

  if (!recipients.length) {
    return [];
  }

  switch (topic) {
    case 'match.found': {
      const matchedUserName = readString(payload.matchedUserName);
      const matchedUserId = readString(payload.matchedUserId);
      const compatibilityScore = readNumber(payload.compatibilityScore);
      const matchTarget = matchedUserName ?? matchedUserId ?? 'a compatible study buddy';
      const scoreText = compatibilityScore !== null ? ` Compatibility score: ${compatibilityScore}%.` : '';

      return buildDrafts(recipients, {
        type: event.eventName,
        title: 'New study buddy match',
        message: `We found you a new match with ${matchTarget}.${scoreText}`,
        sourceTopic: topic,
        producerService: event.producerService,
        correlationId: event.correlationId,
      });
    }

    case 'session.created': {
      const sessionTitle = readString(payload.topic) ?? 'your study session';
      const scheduledAt = readString(payload.sessionDate);
      const whenText = scheduledAt ? ` It starts at ${scheduledAt}.` : '';

      return buildDrafts(recipients, {
        type: event.eventName,
        title: 'Study session created',
        message: `Your session ${sessionTitle} has been created.${whenText}`,
        sourceTopic: topic,
        producerService: event.producerService,
        correlationId: event.correlationId,
      });
    }

    case 'session.participant.joined': {
      const sessionTitle = readString(payload.topic) ?? 'your study session';
      const joiningUserId = readString(payload.joiningUserId) ?? 'A participant';

      return buildDrafts(recipients, {
        type: event.eventName,
        title: 'New session participant',
        message: `${joiningUserId} joined ${sessionTitle}.`,
        sourceTopic: topic,
        producerService: event.producerService,
        correlationId: event.correlationId,
      });
    }

    case 'session.cancelled': {
      const sessionTitle = readString(payload.topic) ?? 'your study session';

      return buildDrafts(recipients, {
        type: event.eventName,
        title: 'Session cancelled',
        message: `${sessionTitle} has been cancelled.`,
        sourceTopic: topic,
        producerService: event.producerService,
        correlationId: event.correlationId,
      });
    }

    case 'message.sent': {
      const sender = readString(payload.senderName) ?? readString(payload.senderId) ?? 'another student';
      const preview = readString(payload.preview);
      const suffix = preview ? ` Preview: ${preview}` : '';

      return buildDrafts(recipients, {
        type: event.eventName,
        title: 'New message',
        message: `${sender} sent you a new message.${suffix}`,
        sourceTopic: topic,
        producerService: event.producerService,
        correlationId: event.correlationId,
      });
    }

    default: {
      const customMessage =
        readString(payload.message) ??
        readString(payload.description) ??
        `A new ${topic} event was received.`;

      return buildDrafts(recipients, {
        type: event.eventName,
        title: 'System notification',
        message: customMessage,
        sourceTopic: topic,
        producerService: event.producerService,
        correlationId: event.correlationId,
      });
    }
  }
};
