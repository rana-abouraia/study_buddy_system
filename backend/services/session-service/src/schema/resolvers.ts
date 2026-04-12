import { prisma } from '../index';
import { Context } from '../index';
import { publishEvent } from '../kafka/producer';

const VALID_SESSION_TYPES = ['ONLINE', 'IN_PERSON'];

export const resolvers = {
  Query: {
    getStudySessions: async () => {
      return await prisma.studySession.findMany({
        include: { participants: true },
        orderBy: { date: 'asc' }
      });
    },

    getStudySessionById: async (_: any, { id }: { id: string }) => {
      return await prisma.studySession.findUnique({
        where: { id },
        include: { participants: true }
      });
    },

    getSessionsByCreator: async (_: any, { creatorId }: { creatorId: string }) => {
      return await prisma.studySession.findMany({
        where: { creatorId },
        include: { participants: true },
        orderBy: { date: 'asc' }
      });
    },

    getSessionsByParticipant: async (_: any, { userId }: { userId: string }) => {
      return await prisma.studySession.findMany({
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
    createStudySession: async (_: any, args: any, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');
      if (userId !== args.creatorId) throw new Error('Not authorized');

      const sessionDate = new Date(args.date);
      if (Number.isNaN(sessionDate.getTime())) throw new Error('Invalid session date');

      if (!VALID_SESSION_TYPES.includes(args.sessionType)) {
        throw new Error('sessionType must be ONLINE or IN_PERSON');
      }

      const session = await prisma.studySession.create({
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

      await publishEvent('study-session-created', {
        sessionId: session.id,
        creatorId: session.creatorId,
        topic: session.topic,
        status: session.status
      });

      return session;
    },

    joinStudySession: async (_: any, { sessionId, userId }: { sessionId: string, userId: string }, context: Context) => {
      if (!context.userId) throw new Error('Not authenticated');
      if (context.userId !== userId) throw new Error('Not authorized');

      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: { participants: true }
      });

      if (!session) throw new Error('Study session not found');
      if (session.status === 'CANCELLED') throw new Error('Cancelled sessions cannot be joined');

      const existingParticipant = await prisma.sessionParticipant.findFirst({
        where: {
          sessionId,
          userId
        }
      });

      if (existingParticipant) throw new Error('User has already joined this session');

      await prisma.sessionParticipant.create({
        data: {
          sessionId,
          userId,
          status: 'JOINED',
          joinedAt: new Date()
        }
      });

      const updatedSession = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: { participants: true }
      });

      await publishEvent('study-session-joined', {
        sessionId,
        userId
      });

      return updatedSession;
    },

    leaveStudySession: async (_: any, { sessionId, userId }: { sessionId: string, userId: string }, context: Context) => {
      if (!context.userId) throw new Error('Not authenticated');
      if (context.userId !== userId) throw new Error('Not authorized');

      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: { participants: true }
      });

      if (!session) throw new Error('Study session not found');

      const participant = await prisma.sessionParticipant.findFirst({
        where: {
          sessionId,
          userId
        }
      });

      if (!participant) throw new Error('User is not a participant in this session');

      await prisma.sessionParticipant.delete({
        where: { id: participant.id }
      });

      const updatedSession = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: { participants: true }
      });

      await publishEvent('study-session-left', {
        sessionId,
        userId
      });

      return updatedSession;
    },

    cancelStudySession: async (_: any, { sessionId, userId }: { sessionId: string, userId: string }, context: Context) => {
      if (!context.userId) throw new Error('Not authenticated');
      if (context.userId !== userId) throw new Error('Not authorized');

      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: { participants: true }
      });

      if (!session) throw new Error('Study session not found');
      if (session.creatorId !== userId) throw new Error('Only the creator can cancel this session');
      if (session.status === 'CANCELLED') throw new Error('Study session is already cancelled');

      const updatedSession = await prisma.studySession.update({
        where: { id: sessionId },
        data: { status: 'CANCELLED' },
        include: { participants: true }
      });

      await publishEvent('study-session-cancelled', {
        sessionId,
        userId
      });

      return updatedSession;
    }
  }
};
