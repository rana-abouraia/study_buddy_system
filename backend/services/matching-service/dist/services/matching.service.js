"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchingService = exports.MatchingService = void 0;
const prisma_js_1 = require("../db/prisma.js");
const scoring_service_js_1 = require("./scoring.service.js");
const producer_js_1 = require("../kafka/producer.js");
const MATCH_MIN_SCORE = Number(process.env.MATCH_MIN_SCORE || 10);
const TOP_MATCH_LIMIT = Number(process.env.TOP_MATCH_LIMIT || 10);
class MatchingService {
    async upsertPreferences(payload) {
        await prisma_js_1.prisma.matchProfile.upsert({
            where: { userId: payload.userId },
            update: {
                courses: payload.courses ?? [],
                topics: payload.topics ?? [],
                studyPace: payload.studyPace ?? null,
                studyMode: payload.studyMode ?? null,
                groupSize: payload.groupSize ?? null,
                studyStyle: payload.studyStyle ?? null
            },
            create: {
                userId: payload.userId,
                courses: payload.courses ?? [],
                topics: payload.topics ?? [],
                studyPace: payload.studyPace ?? null,
                studyMode: payload.studyMode ?? null,
                groupSize: payload.groupSize ?? null,
                studyStyle: payload.studyStyle ?? null
            }
        });
        await this.recalculateMatchesForUser(payload.userId);
    }
    async replaceAvailability(payload) {
        await prisma_js_1.prisma.matchProfile.upsert({
            where: { userId: payload.userId },
            update: {},
            create: {
                userId: payload.userId,
                courses: [],
                topics: []
            }
        });
        await prisma_js_1.prisma.$transaction(async (tx) => {
            await tx.availabilitySlot.deleteMany({
                where: { userId: payload.userId }
            });
            if (payload.availability.length > 0) {
                await tx.availabilitySlot.createMany({
                    data: payload.availability.map((slot) => ({
                        userId: payload.userId,
                        dayOfWeek: slot.dayOfWeek,
                        startTime: slot.startTime,
                        endTime: slot.endTime
                    }))
                });
            }
        });
        await this.recalculateMatchesForUser(payload.userId);
    }
    async loadUserWithAvailability(userId) {
        return prisma_js_1.prisma.matchProfile.findUnique({
            where: { userId },
            include: { availabilitySlots: true }
        });
    }
    async loadCandidates(userId) {
        return prisma_js_1.prisma.matchProfile.findMany({
            where: {
                userId: { not: userId }
            },
            include: { availabilitySlots: true }
        });
    }
    rankCandidates(user, candidates) {
        const ranked = [];
        for (const candidate of candidates) {
            const result = (0, scoring_service_js_1.calculateCompatibility)(user, candidate);
            if (result.score >= MATCH_MIN_SCORE) {
                ranked.push({
                    candidateUserId: candidate.userId,
                    compatibility: result.score,
                    reasons: result.reasons
                });
            }
        }
        ranked.sort((a, b) => {
            if (b.compatibility !== a.compatibility) {
                return b.compatibility - a.compatibility;
            }
            return a.candidateUserId.localeCompare(b.candidateUserId);
        });
        return ranked.slice(0, TOP_MATCH_LIMIT);
    }
    async recalculateMatchesForUser(userId) {
        const user = await this.loadUserWithAvailability(userId);
        if (!user) {
            throw new Error(`User ${userId} not found in matching service`);
        }
        const candidates = await this.loadCandidates(userId);
        await prisma_js_1.prisma.matchResult.deleteMany({
            where: {
                OR: [
                    { userId },
                    { candidateUserId: userId }
                ]
            }
        });
        const rankedMatches = this.rankCandidates(user, candidates);
        for (const match of rankedMatches) {
            await prisma_js_1.prisma.matchResult.upsert({
                where: {
                    userId_candidateUserId: {
                        userId,
                        candidateUserId: match.candidateUserId
                    }
                },
                update: {
                    compatibility: match.compatibility,
                    reasons: match.reasons
                },
                create: {
                    userId,
                    candidateUserId: match.candidateUserId,
                    compatibility: match.compatibility,
                    reasons: match.reasons
                }
            });
            await prisma_js_1.prisma.matchResult.upsert({
                where: {
                    userId_candidateUserId: {
                        userId: match.candidateUserId,
                        candidateUserId: userId
                    }
                },
                update: {
                    compatibility: match.compatibility,
                    reasons: match.reasons
                },
                create: {
                    userId: match.candidateUserId,
                    candidateUserId: userId,
                    compatibility: match.compatibility,
                    reasons: match.reasons
                }
            });
            await (0, producer_js_1.publishMatchFoundEvent)({
                userId,
                matchedUserId: match.candidateUserId,
                userIds: [userId],
                compatibilityScore: match.compatibility,
                reasons: match.reasons
            });
        }
        return rankedMatches;
    }
    async getRecommendedMatches(userId, limit = 10) {
        return prisma_js_1.prisma.matchResult.findMany({
            where: { userId },
            orderBy: [
                { compatibility: "desc" },
                { candidateUserId: "asc" }
            ],
            take: limit
        });
    }
    async getMatchProfile(userId) {
        return prisma_js_1.prisma.matchProfile.findUnique({
            where: { userId },
            include: { availabilitySlots: true }
        });
    }
}
exports.MatchingService = MatchingService;
exports.matchingService = new MatchingService();
