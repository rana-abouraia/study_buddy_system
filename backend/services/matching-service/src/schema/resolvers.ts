import { matchingService } from "../services/matching.service.js";

export const resolvers = {
  Query: {
    getRecommendedMatches: async (
      _: unknown,
      args: { userId: string; limit?: number }
    ) => {
      return matchingService.getRecommendedMatches(args.userId, args.limit ?? 10);
    },

    getMatchProfile: async (_: unknown, args: { userId: string }) => {
      return matchingService.getMatchProfile(args.userId);
    }
  },

  Mutation: {
    recalculateMatches: async (_: unknown, args: { userId: string }) => {
      await matchingService.recalculateMatchesForUser(args.userId);
      return matchingService.getRecommendedMatches(args.userId, 10);
    }
  }
};