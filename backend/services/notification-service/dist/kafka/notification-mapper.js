"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapEventToNotifications = void 0;
const readString = (value) => {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
};
const readNumber = (value) => {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
};
const readStringArray = (value) => {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map((item) => readString(item))
        .filter((item) => Boolean(item));
};
const unique = (values) => [...new Set(values)];
const getRecipients = (payload) => {
    return unique([
        ...readStringArray(payload.userIds),
        ...readStringArray(payload.recipientIds),
        ...readStringArray(payload.participantIds),
        ...readStringArray(payload.inviteeIds),
        readString(payload.userId),
        readString(payload.receiverId),
        readString(payload.inviteeId),
        readString(payload.recipientId),
    ].filter((item) => Boolean(item)));
};
const buildDrafts = (recipients, common) => {
    return recipients.map((userId) => ({
        userId,
        ...common,
    }));
};
const mapEventToNotifications = (topic, event) => {
    const payload = event.payload ?? {};
    const recipients = getRecipients(payload);
    if (!recipients.length) {
        return [];
    }
    const producerService = event.producerService ?? 'unknown-service';
    const correlationId = event.correlationId;
    const eventType = event.eventName ?? topic;
    switch (topic) {
        case 'match-found': {
            const matchedUserName = readString(payload.matchedUserName);
            const matchedUserId = readString(payload.matchedUserId);
            const compatibilityScore = readNumber(payload.compatibilityScore);
            const matchTarget = matchedUserName ?? matchedUserId ?? 'a compatible study buddy';
            const scoreText = compatibilityScore !== null ? ` Compatibility score: ${compatibilityScore}%.` : '';
            return buildDrafts(recipients, {
                type: eventType,
                title: 'New study buddy match',
                message: `We found you a new match with ${matchTarget}.${scoreText}`,
                sourceTopic: topic,
                producerService,
                correlationId,
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
            return buildDrafts(recipients, {
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
            return buildDrafts(recipients, {
                type: eventType,
                title: 'Study session invitation',
                message: `${inviter} invited you to join ${sessionTitle}.`,
                sourceTopic: topic,
                producerService,
                correlationId,
            });
        }
        case 'session-reminder':
        case 'study-session-reminder':
        case 'session-upcoming': {
            const sessionTitle = readString(payload.sessionTitle) ?? readString(payload.topic) ?? 'your upcoming session';
            const scheduledAt = readString(payload.scheduledAt) ??
                readString(payload.sessionDate) ??
                readString(payload.startTime);
            const whenText = scheduledAt ? ` It starts at ${scheduledAt}.` : '';
            return buildDrafts(recipients, {
                type: eventType,
                title: 'Session reminder',
                message: `Reminder: ${sessionTitle} is coming up soon.${whenText}`,
                sourceTopic: topic,
                producerService,
                correlationId,
            });
        }
        default: {
            const customMessage = readString(payload.message) ??
                readString(payload.description) ??
                `A new ${topic} event was received.`;
            return buildDrafts(recipients, {
                type: eventType,
                title: 'System notification',
                message: customMessage,
                sourceTopic: topic,
                producerService,
                correlationId,
            });
        }
    }
};
exports.mapEventToNotifications = mapEventToNotifications;
