import { prisma } from '../index';
import { Context } from '../index';
import { publishEvent } from '../kafka/producer';

const VALID_SESSION_TYPES = ['ONLINE', 'IN_PERSON'];
const VALID_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];

// Helper to format dates
const formatSession = (session: any) => ({
  ...session,
  date: session.date.toISOString(),
  createdAt: session.createdAt.toISOString(),
  updatedAt: session.updatedAt.toISOString(),
  participants: session.participants.map((p: any) => ({
    ...p,
    joinedAt: p.joinedAt?.toISOString() || null
  }))
});

export const resolvers = {
  Query: {
    getSession: async (_: any, { id }: { id: string }) => {
      const session = await prisma.studySession.findUnique({
        where: { id },
        include: { participants: true }
      });
      return session ? formatSession(session) : null;
    },

    getMySessions: async (_: any, __: any, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');
      
      const sessions = await prisma.studySession.findMany({
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
      const sessions = await prisma.studySession.findMany({
        include: { participants: true },
        orderBy: { date: 'asc' }
      });
      
      return sessions.map(formatSession);
    }
  },

  Mutation: {
    createSession: async (_: any, args: any, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');
      
      // Validation
      if (!args.topic?.trim()) throw new Error('Topic is required');
      if (!VALID_SESSION_TYPES.includes(args.sessionType)) {
        throw new Error('Session type must be ONLINE or IN_PERSON');
      }
      if (args.duration <= 0) throw new Error('Duration must be greater than 0');

      const sessionDate = new Date(args.date);
      if (isNaN(sessionDate.getTime())) throw new Error('Invalid date format');
      if (sessionDate < new Date()) throw new Error('Session date must be in the future');

      if (args.sessionType === 'ONLINE' && !args.meetingLink) {
        throw new Error('Meeting link is required for online sessions');
      }
      if (args.sessionType === 'IN_PERSON' && !args.location) {
        throw new Error('Location is required for in-person sessions');
      }

      // Create session with creator as participant
      const session = await prisma.studySession.create({
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
            create: {
              userId: userId,
              status: 'ACCEPTED',
              joinedAt: new Date() // FIXED: Set joinedAt for creator
            }
          }
        },
        include: { participants: true }
      });

      // Publish Kafka event
      await publishEvent('study-session-created', {
        sessionId: session.id,
        creatorId: userId,
        topic: session.topic,
        date: session.date,
        sessionType: session.sessionType
      });

      return formatSession(session);
    },

    joinSession: async (_: any, { sessionId }: { sessionId: string }, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');

      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: { participants: true }
      });

      if (!session) throw new Error('Session not found');
      if (session.status === 'CANCELLED') throw new Error('Session has been cancelled');
      if (session.status === 'COMPLETED') throw new Error('Session has already ended');
      if (session.date < new Date()) throw new Error('Session has already started');

      const alreadyJoined = session.participants.some(p => p.userId === userId);
      if (alreadyJoined) throw new Error('Already joined this session');

      const participant = await prisma.sessionParticipant.create({
        data: {
          sessionId,
          userId,
          status: 'ACCEPTED',
          joinedAt: new Date() // FIXED: Set joinedAt when joining
        }
      });

      await publishEvent('study-session-joined', {
        sessionId,
        userId,
        topic: session.topic,
        creatorId: session.creatorId
      });

      return participant;
    },

    leaveSession: async (_: any, { sessionId }: { sessionId: string }, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');

      const session = await prisma.studySession.findUnique({
        where: { id: sessionId }
      });

      if (!session) throw new Error('Session not found');
      if (session.creatorId === userId) {
        throw new Error('Creator cannot leave — cancel the session instead');
      }

      const participant = await prisma.sessionParticipant.findFirst({
        where: { sessionId, userId }
      });

      if (!participant) throw new Error('You are not in this session');

      await prisma.sessionParticipant.delete({
        where: { id: participant.id }
      });

      return true;
    },

    cancelSession: async (_: any, { sessionId }: { sessionId: string }, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');

      const session = await prisma.studySession.findUnique({
        where: { id: sessionId }
      });

      if (!session) throw new Error('Session not found');
      if (session.creatorId !== userId) {
        throw new Error('Only the creator can cancel this session');
      }
      if (session.status === 'CANCELLED') throw new Error('Session is already cancelled');
      if (session.status === 'COMPLETED') throw new Error('Cannot cancel a completed session');

      await prisma.studySession.update({
        where: { id: sessionId },
        data: { status: 'CANCELLED' }
      });

      return true;
    }
  }
};