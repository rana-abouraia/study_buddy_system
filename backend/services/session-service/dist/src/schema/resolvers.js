"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const index_1 = require("../index");
const producer_1 = require("../kafka/producer");
const VALID_SESSION_TYPES = ['ONLINE', 'IN_PERSON'];
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
            const sessionDate = new Date(args.date);
            if (Number.isNaN(sessionDate.getTime()))
                throw new Error('Invalid session date');
            if (!VALID_SESSION_TYPES.includes(args.sessionType)) {
                throw new Error('sessionType must be ONLINE or IN_PERSON');
            }
            const session = await index_1.prisma.studySession.create({
                data: {
                    creatorId: args.creatorId,
                    topic: args.topic,
                    description: args.description,
                    date: sessionDate,
                    duration: args.duration,
                    sessionType: args.sessionType,
                    location: args.location,
                    meetingLink: args.meetingLink,
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
            await index_1.prisma.sessionParticipant.create({
                data: {
                    sessionId,
                    userId,
                    status: 'JOINED',
                    joinedAt: new Date()
                }
            });
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
            const participant = await index_1.prisma.sessionParticipant.findFirst({
                where: {
                    sessionId,
                    userId
                }
            });
            if (!participant)
                throw new Error('User is not a participant in this session');
            await index_1.prisma.sessionParticipant.delete({
                where: { id: participant.id }
            });
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
            const updatedSession = await index_1.prisma.studySession.update({
                where: { id: sessionId },
                data: { status: 'CANCELLED' },
                include: { participants: true }
            });
            await (0, producer_1.publishEvent)('study-session-cancelled', {
                sessionId,
                userId
            });
            return updatedSession;
        }
    }
};
