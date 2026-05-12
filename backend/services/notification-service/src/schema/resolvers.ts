import { Context } from '../index';

const requireUser = (userId: string | null) => {
  if (!userId) {
    throw new Error('Not authenticated');
  }

  return userId;
};

export const resolvers = {
  Query: {
    myNotifications: async (
      _: unknown,
      { onlyUnread = false, limit = 50 }: { onlyUnread?: boolean; limit?: number },
      { prisma, userId }: Context,
    ) => {
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

    notification: async (_: unknown, { id }: { id: string }, { prisma, userId }: Context) => {
      const currentUserId = requireUser(userId);
      const notification = await prisma.notification.findUnique({ where: { id } });

      if (!notification || notification.userId !== currentUserId) {
        throw new Error('Notification not found');
      }

      return notification;
    },

    notificationsByUser: async (
      _: unknown,
      { userId, onlyUnread = false, limit = 50 }: { userId: string; onlyUnread?: boolean; limit?: number },
      { prisma }: Context,
    ) => {
      return prisma.notification.findMany({
        where: {
          userId,
          ...(onlyUnread ? { isRead: false } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
      });
    },
     unreadNotificationsCount: async (
    _: unknown,
    __: unknown,
    { prisma, userId }: Context,
  ) => {
    const currentUserId = requireUser(userId);

    return prisma.notification.count({
      where: {
        userId: currentUserId,
        isRead: false,
      },
    });
  },
  },

  Mutation: {
    markNotificationAsRead: async (_: unknown, { id }: { id: string }, { prisma, userId }: Context) => {
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

    markAllNotificationsAsRead: async (_: unknown, __: unknown, { prisma, userId }: Context) => {
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
