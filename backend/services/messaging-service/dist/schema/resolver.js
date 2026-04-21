"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const index_1 = require("../index");
const producer_1 = require("../kafka/producer");
exports.resolvers = {
    Query: {
        getConversation: async (_, { otherUserId }, { userId }) => {
            if (!userId)
                throw new Error('Not authenticated');
            if (userId === otherUserId)
                throw new Error('Cannot have a conversation with yourself');
            return await index_1.prisma.conversation.findFirst({
                where: {
                    OR: [
                        { participant1: userId, participant2: otherUserId },
                        { participant1: otherUserId, participant2: userId }
                    ]
                },
                include: { messages: { orderBy: { createdAt: 'asc' } } }
            });
        },
        getMyConversations: async (_, __, { userId }) => {
            if (!userId)
                throw new Error('Not authenticated');
            return await index_1.prisma.conversation.findMany({
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
        getMessages: async (_, { conversationId }, { userId }) => {
            if (!userId)
                throw new Error('Not authenticated');
            const conversation = await index_1.prisma.conversation.findUnique({
                where: { id: conversationId }
            });
            if (!conversation)
                throw new Error('Conversation not found');
            if (conversation.participant1 !== userId && conversation.participant2 !== userId) {
                throw new Error('Not authorized to view this conversation');
            }
            return await index_1.prisma.message.findMany({
                where: { conversationId },
                orderBy: { createdAt: 'asc' }
            });
        }
    },
    Mutation: {
        sendMessage: async (_, { receiverId, content }, { userId }) => {
            if (!userId)
                throw new Error('Not authenticated');
            if (!receiverId)
                throw new Error('Receiver ID is required');
            if (userId === receiverId)
                throw new Error('Cannot send a message to yourself');
            if (!content.trim())
                throw new Error('Message cannot be empty');
            if (content.trim().length > 1000)
                throw new Error('Message cannot exceed 1000 characters');
            let conversation = await index_1.prisma.conversation.findFirst({
                where: {
                    OR: [
                        { participant1: userId, participant2: receiverId },
                        { participant1: receiverId, participant2: userId }
                    ]
                }
            });
            if (!conversation) {
                conversation = await index_1.prisma.conversation.create({
                    data: {
                        participant1: userId,
                        participant2: receiverId
                    }
                });
            }
            const message = await index_1.prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    senderId: userId,
                    content: content.trim()
                }
            });
            await (0, producer_1.publishEvent)('message.sent', {
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
