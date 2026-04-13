import { prisma } from '../index';
import { Context } from '../index';
import { publishEvent } from '../kafka/producer';

export const resolvers = {
  Query: {
    getConversation: async (_: any, { otherUserId }: { otherUserId: string }, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');

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
        include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } }
      });
    },

    getMessages: async (_: any, { conversationId }: { conversationId: string }, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });

      if (!conversation) throw new Error('Conversation not found');
      if (conversation.participant1 !== userId && conversation.participant2 !== userId) {
        throw new Error('Not authorized');
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
      if (!content.trim()) throw new Error('Message cannot be empty');

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

      await publishEvent('notification-created', {
        type: 'NEW_MESSAGE',
        receiverId,
        senderId: userId,
        messageId: message.id,
        content: content.trim()
      });

      return message;
    }
  }
};