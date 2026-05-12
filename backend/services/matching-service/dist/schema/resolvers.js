"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const matching_service_js_1 = require("../services/matching.service.js");
const buddy_service_js_1 = require("../services/buddy.service.js");
const requireAuth = (context) => {
    if (!context.userId) {
        throw new Error("Not authenticated");
    }
    return context.userId;
};
exports.resolvers = {
    Query: {
        getRecommendedMatches: async (_, args, context) => {
            const authUserId = requireAuth(context);
            const targetUserId = args.userId || authUserId;
            return matching_service_js_1.matchingService.getRecommendedMatches(targetUserId, args.limit ?? 10);
        },
        getMatchProfile: async (_, args, context) => {
            const authUserId = requireAuth(context);
            const targetUserId = args.userId || authUserId;
            return matching_service_js_1.matchingService.getMatchProfile(targetUserId);
        },
        getIncomingBuddyRequests: async (_, __, context) => {
            const userId = requireAuth(context);
            return buddy_service_js_1.buddyService.getIncoming(userId);
        },
        getOutgoingBuddyRequests: async (_, __, context) => {
            const userId = requireAuth(context);
            return buddy_service_js_1.buddyService.getOutgoing(userId);
        },
        getMyBuddies: async (_, __, context) => {
            const userId = requireAuth(context);
            return buddy_service_js_1.buddyService.getMyBuddies(userId);
        }
    },
    Mutation: {
        recalculateMatches: async (_, args, context) => {
            const authUserId = requireAuth(context);
            const targetUserId = args.userId || authUserId;
            await matching_service_js_1.matchingService.recalculateMatchesForUser(targetUserId);
            return matching_service_js_1.matchingService.getRecommendedMatches(targetUserId, 10);
        },
        sendBuddyRequest: async (_, args, context) => {
            const senderId = requireAuth(context);
            return buddy_service_js_1.buddyService.sendRequest(senderId, args.receiverId);
        },
        acceptBuddyRequest: async (_, args, context) => {
            const userId = requireAuth(context);
            return buddy_service_js_1.buddyService.accept(userId, args.requestId);
        },
        rejectBuddyRequest: async (_, args, context) => {
            const userId = requireAuth(context);
            return buddy_service_js_1.buddyService.reject(userId, args.requestId);
        },
        updateMatchProfile: async (_, { input }, context) => {
            const userId = requireAuth(context);
            return matching_service_js_1.matchingService.updateProfile(userId, input);
        }
    },
    BuddyRequest: {
        createdAt: (parent) => parent.createdAt instanceof Date
            ? parent.createdAt.toISOString()
            : parent.createdAt,
        updatedAt: (parent) => parent.updatedAt instanceof Date
            ? parent.updatedAt.toISOString()
            : parent.updatedAt
    }
};
