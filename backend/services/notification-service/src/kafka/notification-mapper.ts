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
      readString(payload.creatorId),
      readString(payload.matchedUserId),
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

    case 'buddy-request-received': {
      const senderName = readString(payload.senderName);
      const senderId = readString(payload.senderId);
      const sender = senderName ?? senderId ?? 'another student';

      return buildDrafts(recipients, {
        type: eventType,
        title: 'New buddy request',
        message: `${sender} sent you a buddy request.`,
        sourceTopic: topic,
        producerService,
        correlationId,
      });
    }

    case 'buddy-request-accepted': {
      const accepterName = readString(payload.accepterName);
      const accepterId = readString(payload.accepterId) ?? readString(payload.receiverId);
      const accepter = accepterName ?? accepterId ?? 'your study buddy';

      // Only notify the ORIGINAL sender (whose request was accepted), not the accepter.
      const targetRecipient = readString(payload.recipientId) ?? readString(payload.senderId);
      if (!targetRecipient) return [];

      return buildDrafts([targetRecipient], {
        type: eventType,
        title: 'Buddy request accepted',
        message: `${accepter} accepted your buddy request.`,
        sourceTopic: topic,
        producerService,
        correlationId,
      });
    }

    case 'session-invitation-received':
    case 'study-session-invitation': {
      const sessionTitle = readString(payload.sessionTitle) ?? readString(payload.topic) ?? 'a study session';
      const inviterName = readString(payload.inviterName);
      const inviterId = readString(payload.inviterId);
      const inviter = inviterName ?? inviterId ?? 'A study buddy';

      // Invitation: recipient is the invitee only. inviterId leaks into the
      // default getRecipients via payload shape variations, so restrict here.
      const invitee = readString(payload.inviteeId) ?? readString(payload.recipientId);
      if (!invitee) return [];

      return buildDrafts([invitee], {
        type: eventType,
        title: 'Study session invitation',
        message: `${inviter} invited you to join ${sessionTitle}.`,
        sourceTopic: topic,
        producerService,
        correlationId,
      });
    }

    case 'study-session-created': {
      const sessionTitle = readString(payload.topic) ?? 'your study session';
      const sessionDate = readString(payload.date);
      const whenText = sessionDate ? ` Scheduled for ${sessionDate}.` : '';

      // Only the creator gets the "session created" notification — invitees will
      // receive a separate 'study-session-invitation' event.
      const creator = readString(payload.creatorId);
      if (!creator) return [];

      return buildDrafts([creator], {
        type: eventType,
        title: 'Study session created',
        message: `Your study session "${sessionTitle}" has been created.${whenText}`,
        sourceTopic: topic,
        producerService,
        correlationId,
      });
    }

    case 'study-session-joined': {
      const sessionTitle = readString(payload.topic) ?? 'a study session';
      const joinerId = readString(payload.userId) ?? 'Someone';

      // Notify only the session creator that someone joined (not the joiner themselves).
      const creator = readString(payload.creatorId);
      if (!creator || creator === payload.userId) return [];

      return buildDrafts([creator], {
        type: eventType,
        title: 'Someone joined your session',
        message: `${joinerId} joined "${sessionTitle}".`,
        sourceTopic: topic,
        producerService,
        correlationId,
      });
    }

    case 'study-session-cancelled': {
      const sessionTitle = readString(payload.topic) ?? 'a study session';

      return buildDrafts(recipients, {
        type: eventType,
        title: 'Study session cancelled',
        message: `The session "${sessionTitle}" has been cancelled.`,
        sourceTopic: topic,
        producerService,
        correlationId,
      });
    }

    case 'notification-created': {
      const senderId = readString(payload.senderId) ?? 'Someone';
      const content = readString(payload.content) ?? '';
      const preview = content.length > 60 ? `${content.slice(0, 60)}...` : content;

      return buildDrafts(recipients, {
        type: eventType,
        title: 'New message',
        message: preview ? `${senderId}: ${preview}` : `${senderId} sent you a message.`,
        sourceTopic: topic,
        producerService,
        correlationId,
      });
    }

    case 'session-reminder':
    case 'study-session-reminder':
    case 'session-upcoming': {
      const sessionTitle = readString(payload.sessionTitle) ?? readString(payload.topic) ?? 'your upcoming session';
      const scheduledAt =
        readString(payload.scheduledAt) ??
        readString(payload.sessionDate) ??
        readString(payload.startTime);
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
