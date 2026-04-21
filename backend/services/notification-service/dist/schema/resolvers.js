"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const requireUser = (userId) => {
    if (!userId) {
        throw new Error('Not authenticated');
    }
    return userId;
};
exports.resolvers = {
    Query: {
        myNotifications: async (_, { onlyUnread = false, limit = 50 }, { prisma, userId }) => {
            const currentUserId = requireUser(userId);
            return prisma.notification.findMany({
                where: {
                    userId: currentUserId,
                    ...(onlyUnread ? { isRead: false } : {}),
                },
                orderBy: { createdAt: 'desc' },
                take: Math.min(limit, 100),
            });
        },
        notification: async (_, { id }, { prisma, userId }) => {
            const currentUserId = requireUser(userId);
            const notification = await prisma.notification.findUnique({ where: { id } });
            if (!notification || notification.userId !== currentUserId) {
                throw new Error('Notification not found');
            }
            return notification;
        },
        notificationsByUser: async (_, { userId, onlyUnread = false, limit = 50 }, { prisma }) => {
            return prisma.notification.findMany({
                where: {
                    userId,
                    ...(onlyUnread ? { isRead: false } : {}),
                },
                orderBy: { createdAt: 'desc' },
                take: Math.min(limit, 100),
            });
        },
    },
    Mutation: {
        markNotificationAsRead: async (_, { id }, { prisma, userId }) => {
            const currentUserId = requireUser(userId);
            const notification = await prisma.notification.findUnique({ where: { id } });
            if (!notification || notification.userId !== currentUserId) {
                throw new Error('Notification not found');
            }
            if (notification.isRead) {
                return notification;
            }
            return prisma.notification.update({
                where: { id },
                data: {
                    isRead: true,
                    readAt: new Date(),
                },
            });
        },
        markAllNotificationsAsRead: async (_, __, { prisma, userId }) => {
            const currentUserId = requireUser(userId);
            const result = await prisma.notification.updateMany({
                where: {
                    userId: currentUserId,
                    isRead: false,
                },
                data: {
                    isRead: true,
                    readAt: new Date(),
                },
            });
            return { count: result.count };
        },
    },
};
