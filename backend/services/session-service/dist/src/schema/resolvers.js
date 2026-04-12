"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const client_1 = require("@prisma/client");
const index_1 = require("../index");
const producer_1 = require("../kafka/producer");
const VALID_SESSION_TYPES = Object.values(client_1.SessionType);
const normalizeOptionalString = (value) => {
    if (typeof value !== 'string')
        return undefined;
    const trimmedValue = value.trim();
    return trimmedValue ? trimmedValue : undefined;
};
const handlePrismaError = (error, defaultMessage, uniqueConstraintMessage) => {
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            throw new Error(uniqueConstraintMessage || 'A unique constraint was violated');
        }
        if (error.code === 'P2025') {
            throw new Error('Requested record was not found');
        }
        throw new Error(defaultMessage);
    }
    if (error instanceof client_1.Prisma.PrismaClientValidationError) {
        throw new Error(defaultMessage);
    }
    throw error;
};
exports.resolvers = {
    Query: {
        getStudySessions: async () => {
            return await index_1.prisma.studySession.findMany({
                include: { participants: true },
                orderBy: { date: 'asc' }
            });
        },
        getStudySessionById: async (_, { id }) => {
            return await index_1.prisma.studySession.findUnique({
                where: { id },
                include: { participants: true }
            });
        },
        getSessionsByCreator: async (_, { creatorId }) => {
            return await index_1.prisma.studySession.findMany({
                where: { creatorId },
                include: { participants: true },
                orderBy: { date: 'asc' }
            });
        },
        getSessionsByParticipant: async (_, { userId }) => {
            return await index_1.prisma.studySession.findMany({
                where: {
                    participants: {
                        some: { userId }
                    }
                },
                include: { participants: true },
                orderBy: { date: 'asc' }
            });
        }
    },
    Mutation: {
        createStudySession: async (_, args, { userId }) => {
            if (!userId)
                throw new Error('Not authenticated');
            if (userId !== args.creatorId)
                throw new Error('Not authorized');
            const topic = normalizeOptionalString(args.topic);
            if (!topic)
                throw new Error('Topic must not be empty');
            if (args.duration <= 0)
                throw new Error('Duration must be greater than 0');
            const sessionDate = new Date(args.date);
            if (Number.isNaN(sessionDate.getTime()))
                throw new Error('Invalid session date');
            if (sessionDate <= new Date())
                throw new Error('Session date must be in the future');
            const normalizedSessionType = normalizeOptionalString(args.sessionType)?.toUpperCase();
            if (!normalizedSessionType || !VALID_SESSION_TYPES.includes(normalizedSessionType)) {
                throw new Error('sessionType must be ONLINE or IN_PERSON');
            }
            const sessionType = normalizedSessionType;
            const description = normalizeOptionalString(args.description);
            const location = normalizeOptionalString(args.location);
            const meetingLink = normalizeOptionalString(args.meetingLink);
            const contactInfo = normalizeOptionalString(args.contactInfo);
            if (sessionType === 'ONLINE' && !meetingLink) {
                throw new Error('meetingLink is required for ONLINE sessions');
            }
            if (sessionType === 'IN_PERSON' && !location) {
                throw new Error('location is required for IN_PERSON sessions');
            }
            try {
                const session = await index_1.prisma.studySession.create({
                    data: {
                        creatorId: args.creatorId,
                        topic,
                        description,
                        date: sessionDate,
                        duration: args.duration,
                        sessionType,
                        location,
                        meetingLink,
                        contactInfo,
                        participants: {
                            create: {
                                userId: args.creatorId,
                                status: 'JOINED',
                                joinedAt: new Date()
                            }
                        }
                    },
                    include: { participants: true }
                });
                await (0, producer_1.publishEvent)('study-session-created', {
                    sessionId: session.id,
                    creatorId: session.creatorId,
                    topic: session.topic,
                    status: session.status
                });
                return session;
            }
            catch (error) {
                handlePrismaError(error, 'Failed to create study session');
            }
        },
        joinStudySession: async (_, { sessionId, userId }, context) => {
            if (!context.userId)
                throw new Error('Not authenticated');
            if (context.userId !== userId)
                throw new Error('Not authorized');
            const session = await index_1.prisma.studySession.findUnique({
                where: { id: sessionId },
                include: { participants: true }
            });
            if (!session)
                throw new Error('Study session not found');
            if (session.status === 'CANCELLED')
                throw new Error('Cancelled sessions cannot be joined');
            const existingParticipant = await index_1.prisma.sessionParticipant.findFirst({
                where: {
                    sessionId,
                    userId
                }
            });
            if (existingParticipant)
                throw new Error('User has already joined this session');
            try {
                await index_1.prisma.sessionParticipant.create({
                    data: {
                        sessionId,
                        userId,
                        status: 'JOINED',
                        joinedAt: new Date()
                    }
                });
            }
            catch (error) {
                handlePrismaError(error, 'Failed to join study session', 'User has already joined this session');
            }
            const updatedSession = await index_1.prisma.studySession.findUnique({
                where: { id: sessionId },
                include: { participants: true }
            });
            await (0, producer_1.publishEvent)('study-session-joined', {
                sessionId,
                userId
            });
            return updatedSession;
        },
        leaveStudySession: async (_, { sessionId, userId }, context) => {
            if (!context.userId)
                throw new Error('Not authenticated');
            if (context.userId !== userId)
                throw new Error('Not authorized');
            const session = await index_1.prisma.studySession.findUnique({
                where: { id: sessionId },
                include: { participants: true }
            });
            if (!session)
                throw new Error('Study session not found');
            if (session.creatorId === userId) {
                throw new Error('The creator cannot leave their own session. Cancel it instead.');
            }
            const participant = await index_1.prisma.sessionParticipant.findFirst({
                where: {
                    sessionId,
                    userId
                }
            });
            if (!participant)
                throw new Error('User is not a participant in this session');
            try {
                await index_1.prisma.sessionParticipant.delete({
                    where: { id: participant.id }
                });
            }
            catch (error) {
                handlePrismaError(error, 'Failed to leave study session');
            }
            const updatedSession = await index_1.prisma.studySession.findUnique({
                where: { id: sessionId },
                include: { participants: true }
            });
            await (0, producer_1.publishEvent)('study-session-left', {
                sessionId,
                userId
            });
            return updatedSession;
        },
        cancelStudySession: async (_, { sessionId, userId }, context) => {
            if (!context.userId)
                throw new Error('Not authenticated');
            if (context.userId !== userId)
                throw new Error('Not authorized');
            const session = await index_1.prisma.studySession.findUnique({
                where: { id: sessionId },
                include: { participants: true }
            });
            if (!session)
                throw new Error('Study session not found');
            if (session.creatorId !== userId)
                throw new Error('Only the creator can cancel this session');
            if (session.status === 'CANCELLED')
                throw new Error('Study session is already cancelled');
            let updatedSession;
            try {
                updatedSession = await index_1.prisma.studySession.update({
                    where: { id: sessionId },
                    data: { status: 'CANCELLED' },
                    include: { participants: true }
                });
            }
            catch (error) {
                handlePrismaError(error, 'Failed to cancel study session');
            }
            await (0, producer_1.publishEvent)('study-session-cancelled', {
                sessionId,
                userId
            });
            return updatedSession;
        }
    }
};
