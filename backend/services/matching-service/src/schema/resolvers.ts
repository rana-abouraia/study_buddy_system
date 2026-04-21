import { matchingService } from "../services/matching.service.js";
import { buddyService } from "../services/buddy.service.js";
import type { Context } from "../index.js";

const requireAuth = (context: Context) => {
  if (!context.userId) {
    throw new Error("Not authenticated");
  }
  return context.userId;
};

export const resolvers = {
  Query: {
    getRecommendedMatches: async (
      _: unknown,
      args: { userId?: string; limit?: number },
      context: Context
    ) => {
      const authUserId = requireAuth(context);
      const targetUserId = args.userId || authUserId;
      return matchingService.getRecommendedMatches(targetUserId, args.limit ?? 10);
    },

    getMatchProfile: async (
      _: unknown,
      args: { userId?: string },
      context: Context
    ) => {
      const authUserId = requireAuth(context);
      const targetUserId = args.userId || authUserId;
      return matchingService.getMatchProfile(targetUserId);
    },

    getIncomingBuddyRequests: async (
      _: unknown,
      __: unknown,
      context: Context
    ) => {
      const userId = requireAuth(context);
      return buddyService.getIncoming(userId);
    },

    getOutgoingBuddyRequests: async (
      _: unknown,
      __: unknown,
      context: Context
    ) => {
      const userId = requireAuth(context);
      return buddyService.getOutgoing(userId);
    },

    getMyBuddies: async (_: unknown, __: unknown, context: Context) => {
      const userId = requireAuth(context);
      return buddyService.getMyBuddies(userId);
    }
  },

  Mutation: {
    recalculateMatches: async (
      _: unknown,
      args: { userId?: string },
      context: Context
    ) => {
      const authUserId = requireAuth(context);
      const targetUserId = args.userId || authUserId;
      await matchingService.recalculateMatchesForUser(targetUserId);
      return matchingService.getRecommendedMatches(targetUserId, 10);
    },

    sendBuddyRequest: async (
      _: unknown,
      args: { receiverId: string },
      context: Context
    ) => {
      const senderId = requireAuth(context);
      return buddyService.sendRequest(senderId, args.receiverId);
    },

    acceptBuddyRequest: async (
      _: unknown,
      args: { requestId: string },
      context: Context
    ) => {
      const userId = requireAuth(context);
      return buddyService.accept(userId, args.requestId);
    },

    rejectBuddyRequest: async (
      _: unknown,
      args: { requestId: string },
      context: Context
    ) => {
      const userId = requireAuth(context);
      return buddyService.reject(userId, args.requestId);
    }
  },

  BuddyRequest: {
    createdAt: (parent: { createdAt: Date | string }) =>
      parent.createdAt instanceof Date
        ? parent.createdAt.toISOString()
        : parent.createdAt,
    updatedAt: (parent: { updatedAt: Date | string }) =>
      parent.updatedAt instanceof Date
        ? parent.updatedAt.toISOString()
        : parent.updatedAt
  }
};
