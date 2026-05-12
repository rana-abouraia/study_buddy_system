"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const index_1 = require("../index");
const producer_1 = require("../kafka/producer");
const VALID_SESSION_TYPES = ['ONLINE', 'IN_PERSON'];
const VALID_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];
// Helper to compute the effective session status based on current time
const computeEffectiveStatus = (session) => {
    if (session.status === 'CANCELLED')
        return 'CANCELLED';
    const date = session.date instanceof Date ? session.date : new Date(session.date);
    const endMs = date.getTime() + (session.duration || 0) * 60000;
    const now = Date.now();
    if (now < date.getTime())
        return 'UPCOMING';
    if (now < endMs)
        return 'ONGOING';
    return 'COMPLETED';
};
// Helper to format dates
const formatSession = (session) => ({
    ...session,
    status: computeEffectiveStatus(session),
    date: session.date.toISOString(),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    participants: session.participants.map((p) => ({
        ...p,
        joinedAt: p.joinedAt?.toISOString() || null
    }))
});
exports.resolvers = {
    Query: {
        getSession: async (_, { id }) => {
            const session = await index_1.prisma.studySession.findUnique({
                where: { id },
                include: { participants: true }
            });
            return session ? formatSession(session) : null;
        },
        getMySessions: async (_, __, { userId }) => {
            if (!userId)
                throw new Error('Not authenticated');
            const sessions = await index_1.prisma.studySession.findMany({
                where: {
                    OR: [
                        { creatorId: userId },
                        { participants: { some: { userId } } }
                    ]
                },
                include: { participants: true },
                orderBy: { date: 'asc' }
            });
            return sessions.map(formatSession);
        },
        getAllSessions: async () => {
            const sessions = await index_1.prisma.studySession.findMany({
                include: { participants: true },
                orderBy: { date: 'asc' }
            });
            return sessions.map(formatSession);
        },
        getMyInvitations: async (_, __, { userId }) => {
            if (!userId)
                throw new Error('Not authenticated');
            const invitations = await index_1.prisma.sessionParticipant.findMany({
                where: { userId, status: 'INVITED' },
                orderBy: { id: 'desc' }
            });
            return invitations.map((p) => ({
                ...p,
                joinedAt: p.joinedAt?.toISOString() || null
            }));
        }
    },
    Mutation: {
        createSession: async (_, args, { userId }) => {
            if (!userId)
                throw new Error('Not authenticated');
            // Validation
            if (!args.topic?.trim())
                throw new Error('Topic is required');
            if (!VALID_SESSION_TYPES.includes(args.sessionType)) {
                throw new Error('Session type must be ONLINE or IN_PERSON');
            }
            if (args.duration <= 0)
                throw new Error('Duration must be greater than 0');
            const sessionDate = new Date(args.date);
            if (isNaN(sessionDate.getTime()))
                throw new Error('Invalid date format');
            if (sessionDate < new Date())
                throw new Error('Session date must be in the future');
            if (args.sessionType === 'ONLINE' && !args.meetingLink) {
                throw new Error('Meeting link is required for online sessions');
            }
            if (args.sessionType === 'IN_PERSON' && !args.location) {
                throw new Error('Location is required for in-person sessions');
            }
            // Normalize participantIds: dedupe and remove creator's own ID
            const rawParticipantIds = Array.isArray(args.participantIds) ? args.participantIds : [];
            const inviteeIds = Array.from(new Set(rawParticipantIds.filter((id) => id && id !== userId)));
            // Create session with creator as participant + invited participants
            const session = await index_1.prisma.studySession.create({
                data: {
                    creatorId: userId,
                    topic: args.topic.trim(),
                    description: args.description?.trim(),
                    date: sessionDate,
                    duration: args.duration,
                    sessionType: args.sessionType,
                    location: args.location?.trim(),
                    meetingLink: args.meetingLink?.trim(),
                    status: 'UPCOMING',
                    participants: {
                        create: [
                            {
                                userId: userId,
                                status: 'ACCEPTED',
                                joinedAt: new Date() // FIXED: Set joinedAt for creator
                            },
                            ...inviteeIds.map((inviteeId) => ({
                                userId: inviteeId,
                                status: 'INVITED',
                                joinedAt: null
                            }))
                        ]
                    }
                },
                include: { participants: true }
            });
            // Publish Kafka event
            await (0, producer_1.publishEvent)('study-session-created', {
                sessionId: session.id,
                creatorId: userId,
                topic: session.topic,
                date: session.date,
                sessionType: session.sessionType,
                participantIds: inviteeIds
            });
            // Publish invitation events (one per invitee)
            if (inviteeIds.length > 0) {
                await Promise.all(inviteeIds.map((inviteeId) => (0, producer_1.publishEvent)('study-session-invitation', {
                    sessionId: session.id,
                    inviteeId,
                    inviterId: userId,
                    topic: session.topic,
                    date: session.date.toISOString(),
                    sessionType: session.sessionType
                })));
            }
            return formatSession(session);
        },
        joinSession: async (_, { sessionId }, { userId }) => {
            if (!userId)
                throw new Error('Not authenticated');
            const session = await index_1.prisma.studySession.findUnique({
                where: { id: sessionId },
                include: { participants: true }
            });
            if (!session)
                throw new Error('Session not found');
            if (session.status === 'CANCELLED')
                throw new Error('Session has been cancelled');
            if (session.status === 'COMPLETED')
                throw new Error('Session has already ended');
            if (session.date < new Date())
                throw new Error('Session has already started');
            const alreadyJoined = session.participants.some(p => p.userId === userId);
            if (alreadyJoined)
                throw new Error('Already joined this session');
            const participant = await index_1.prisma.sessionParticipant.create({
                data: {
                    sessionId,
                    userId,
                    status: 'ACCEPTED',
                    joinedAt: new Date() // FIXED: Set joinedAt when joining
                }
            });
            await (0, producer_1.publishEvent)('study-session-joined', {
                sessionId,
                userId,
                topic: session.topic,
                creatorId: session.creatorId
            });
            return participant;
        },
        updateSession: async (_, { sessionId, meetingLink, location, participantIds }, { userId }) => {
            if (!userId)
                throw new Error('Not authenticated');
            const session = await index_1.prisma.studySession.findUnique({
                where: { id: sessionId },
                include: { participants: true }
            });
            if (!session)
                throw new Error('Session not found');
            if (session.creatorId !== userId) {
                throw new Error('Only the creator can update this session');
            }
            if (session.status === 'CANCELLED')
                throw new Error('Cannot update a cancelled session');
            if (computeEffectiveStatus(session) === 'COMPLETED') {
                throw new Error('Cannot update a completed session');
            }
            const isOnline = session.sessionType === 'ONLINE';
            const normalizedMeetingLink = meetingLink?.trim() || null;
            const normalizedLocation = location?.trim() || null;
            if (isOnline && !normalizedMeetingLink) {
                throw new Error('Meeting link is required for online sessions');
            }
            if (!isOnline && !normalizedLocation) {
                throw new Error('Location is required for in-person sessions');
            }
            const requestedParticipantIds = Array.isArray(participantIds) ? participantIds : [];
            const inviteeIds = Array.from(new Set(requestedParticipantIds.filter((id) => id && id !== userId)));
            const existingByUserId = new Map(session.participants.map((p) => [p.userId, p]));
            const existingCreatorParticipant = existingByUserId.get(userId);
            await index_1.prisma.sessionParticipant.deleteMany({
                where: {
                    sessionId,
                    userId: { not: userId }
                }
            });
            if (!existingCreatorParticipant) {
                await index_1.prisma.sessionParticipant.create({
                    data: {
                        sessionId,
                        userId,
                        status: 'ACCEPTED',
                        joinedAt: new Date()
                    }
                });
            }
            if (inviteeIds.length > 0) {
                await index_1.prisma.sessionParticipant.createMany({
                    data: inviteeIds.map((inviteeId) => ({
                        sessionId,
                        userId: inviteeId,
                        status: existingByUserId.get(inviteeId)?.status === 'ACCEPTED' ? 'ACCEPTED' : 'INVITED',
                        joinedAt: existingByUserId.get(inviteeId)?.status === 'ACCEPTED'
                            ? existingByUserId.get(inviteeId)?.joinedAt
                            : null
                    }))
                });
            }
            const updated = await index_1.prisma.studySession.update({
                where: { id: sessionId },
                data: {
                    meetingLink: isOnline ? normalizedMeetingLink : null,
                    location: isOnline ? null : normalizedLocation
                },
                include: { participants: true }
            });
            const newlyInvitedIds = inviteeIds.filter((inviteeId) => !existingByUserId.has(inviteeId));
            if (newlyInvitedIds.length > 0) {
                await Promise.all(newlyInvitedIds.map((inviteeId) => (0, producer_1.publishEvent)('study-session-invitation', {
                    sessionId,
                    inviteeId,
                    inviterId: userId,
                    topic: updated.topic,
                    date: updated.date.toISOString(),
                    sessionType: updated.sessionType
                })));
            }
            return formatSession(updated);
        },
        leaveSession: async (_, { sessionId }, { userId }) => {
            if (!userId)
                throw new Error('Not authenticated');
            const session = await index_1.prisma.studySession.findUnique({
                where: { id: sessionId }
            });
            if (!session)
                throw new Error('Session not found');
            if (session.creatorId === userId) {
                throw new Error('Creator cannot leave — cancel the session instead');
            }
            const participant = await index_1.prisma.sessionParticipant.findFirst({
                where: { sessionId, userId }
            });
            if (!participant)
                throw new Error('You are not in this session');
            await index_1.prisma.sessionParticipant.delete({
                where: { id: participant.id }
            });
            return true;
        },
        cancelSession: async (_, { sessionId }, { userId }) => {
            if (!userId)
                throw new Error('Not authenticated');
            const session = await index_1.prisma.studySession.findUnique({
                where: { id: sessionId },
                include: { participants: true }
            });
            if (!session)
                throw new Error('Session not found');
            if (session.creatorId !== userId) {
                throw new Error('Only the creator can cancel this session');
            }
            if (session.status === 'CANCELLED')
                throw new Error('Session is already cancelled');
            if (session.status === 'COMPLETED')
                throw new Error('Cannot cancel a completed session');
            await index_1.prisma.studySession.update({
                where: { id: sessionId },
                data: { status: 'CANCELLED' }
            });
            // Notify all participants except the canceller (the creator).
            const participantIds = session.participants
                .map((p) => p.userId)
                .filter((id) => id && id !== userId);
            if (participantIds.length > 0) {
                await (0, producer_1.publishEvent)('study-session-cancelled', {
                    sessionId,
                    creatorId: userId,
                    topic: session.topic,
                    participantIds
                });
            }
            return true;
        },
        respondToSessionInvitation: async (_, { sessionId, accept }, { userId }) => {
            if (!userId)
                throw new Error('Not authenticated');
            const participant = await index_1.prisma.sessionParticipant.findFirst({
                where: { sessionId, userId }
            });
            if (!participant)
                throw new Error('Invitation not found');
            if (participant.status !== 'INVITED')
                throw new Error('Invitation is no longer pending');
            const updated = await index_1.prisma.sessionParticipant.update({
                where: { id: participant.id },
                data: accept
                    ? { status: 'ACCEPTED', joinedAt: new Date() }
                    : { status: 'DECLINED' }
            });
            if (accept) {
                const session = await index_1.prisma.studySession.findUnique({
                    where: { id: sessionId }
                });
                if (session) {
                    await (0, producer_1.publishEvent)('study-session-joined', {
                        sessionId,
                        userId,
                        topic: session.topic,
                        creatorId: session.creatorId
                    });
                }
            }
            return {
                ...updated,
                joinedAt: updated.joinedAt?.toISOString() || null
            };
        }
    }
};
