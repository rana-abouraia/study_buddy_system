"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchingService = exports.MatchingService = void 0;
const prisma_js_1 = require("../db/prisma.js");
const scoring_service_js_1 = require("./scoring.service.js");
const producer_js_1 = require("../kafka/producer.js");
const MATCH_MIN_SCORE = Number(process.env.MATCH_MIN_SCORE || 20);
const TOP_MATCH_LIMIT = Number(process.env.TOP_MATCH_LIMIT || 10);
class MatchingService {
    async ensureUserExists(payload) {
        await prisma_js_1.prisma.matchProfile.upsert({
            where: { userId: payload.userId },
            update: {},
            create: {
                userId: payload.userId,
                courses: [],
                topics: []
            }
        });
    }
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
        await prisma_js_1.prisma.$transaction([
            prisma_js_1.prisma.availabilitySlot.deleteMany({
                where: { userId: payload.userId }
            }),
            prisma_js_1.prisma.availabilitySlot.createMany({
                data: payload.availability.map((slot) => ({
                    userId: payload.userId,
                    dayOfWeek: slot.dayOfWeek,
                    startTime: slot.startTime,
                    endTime: slot.endTime
                }))
            })
        ]);
        await this.recalculateMatchesForUser(payload.userId);
    }
    async recalculateMatchesForUser(userId) {
        const user = await prisma_js_1.prisma.matchProfile.findUnique({
            where: { userId },
            include: { availabilitySlots: true }
        });
        if (!user) {
            throw new Error(`User ${userId} not found in matching service`);
        }
        const candidates = await prisma_js_1.prisma.matchProfile.findMany({
            where: {
                userId: { not: userId }
            },
            include: { availabilitySlots: true }
        });
        await prisma_js_1.prisma.matchResult.deleteMany({
            where: { userId }
        });
        const validMatches = [];
        for (const candidate of candidates) {
            const result = (0, scoring_service_js_1.calculateCompatibility)(user, candidate);
            if (result.score >= MATCH_MIN_SCORE) {
                validMatches.push({
                    candidateUserId: candidate.userId,
                    compatibility: result.score,
                    reasons: result.reasons
                });
            }
        }
        validMatches.sort((a, b) => b.compatibility - a.compatibility);
        const topMatches = validMatches.slice(0, TOP_MATCH_LIMIT);
        for (const match of topMatches) {
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
            await (0, producer_js_1.publishMatchFoundEvent)({
                userId,
                matchedUserId: match.candidateUserId,
                compatibilityScore: match.compatibility,
                reasons: match.reasons
            });
        }
        return topMatches;
    }
    async getRecommendedMatches(userId, limit = 10) {
        return prisma_js_1.prisma.matchResult.findMany({
            where: { userId },
            orderBy: { compatibility: "desc" },
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
