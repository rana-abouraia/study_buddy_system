"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const matching_service_js_1 = require("../services/matching.service.js");
exports.resolvers = {
    Query: {
        getRecommendedMatches: async (_, args) => {
            return matching_service_js_1.matchingService.getRecommendedMatches(args.userId, args.limit ?? 10);
        },
        getMatchProfile: async (_, args) => {
            return matching_service_js_1.matchingService.getMatchProfile(args.userId);
        }
    },
    Mutation: {
        recalculateMatches: async (_, args) => {
            await matching_service_js_1.matchingService.recalculateMatchesForUser(args.userId);
            return matching_service_js_1.matchingService.getRecommendedMatches(args.userId, 10);
        }
    }
};
