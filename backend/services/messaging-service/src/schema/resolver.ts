import { prisma } from '../index';
import { Context } from '../index';
import { publishEvent } from '../kafka/producer';

export const resolvers = {
  Query: {
    getConversation: async (_: any, { otherUserId }: { otherUserId: string }, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');
      if (userId === otherUserId) throw new Error('Cannot have a conversation with yourself');

      return await prisma.conversation.findFirst({
        where: {
          OR: [
            { participant1: userId, participant2: otherUserId },
            { participant1: otherUserId, participant2: userId }
          ]
        },
        include: { messages: { orderBy: { createdAt: 'asc' } } }
      });
    },

    getMyConversations: async (_: any, __: any, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');

      return await prisma.conversation.findMany({
        where: {
          OR: [
            { participant1: userId },
            { participant2: userId }
          ]
        },
        include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { updatedAt: 'desc' }
      });
    },

    getMessages: async (_: any, { conversationId }: { conversationId: string }, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });

      if (!conversation) throw new Error('Conversation not found');
      if (conversation.participant1 !== userId && conversation.participant2 !== userId) {
        throw new Error('Not authorized to view this conversation');
      }

      return await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' }
      });
    }
  },

  Mutation: {
    sendMessage: async (_: any, { receiverId, content }: { receiverId: string, content: string }, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');
      if (!receiverId) throw new Error('Receiver ID is required');
      if (userId === receiverId) throw new Error('Cannot send a message to yourself');
      if (!content.trim()) throw new Error('Message cannot be empty');
      if (content.trim().length > 1000) throw new Error('Message cannot exceed 1000 characters');

      const [userA, userB] = userId < receiverId ? [userId, receiverId] : [receiverId, userId];
      const connection = await prisma.connection.findUnique({
        where: { userA_userB: { userA, userB } },
      });
      if (!connection) {
        throw new Error('You can only message connected study buddies (accept a buddy request or get matched first)');
      }

      let conversation = await prisma.conversation.findFirst({
        where: {
          OR: [
            { participant1: userId, participant2: receiverId },
            { participant1: receiverId, participant2: userId }
          ]
        }
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            participant1: userId,
            participant2: receiverId
          }
        });
      }

      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: userId,
          content: content.trim()
        }
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() }
      });

      await publishEvent('notification-created', {
        type: 'NEW_MESSAGE',
        receiverId,
        senderId: userId,
        messageId: message.id,
        conversationId: conversation.id,
        senderId: userId,
        receiverId,
        recipientIds: [receiverId],
        preview: content.trim().slice(0, 140)
      });

      return message;
    }
  }
};
