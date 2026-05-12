"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchingService = exports.MatchingService = void 0;
const prisma_js_1 = require("../db/prisma.js");
const scoring_service_js_1 = require("./scoring.service.js");
const producer_js_1 = require("../kafka/producer.js");
const MATCH_MIN_SCORE = Number(process.env.MATCH_MIN_SCORE || 10);
const TOP_MATCH_LIMIT = Number(process.env.TOP_MATCH_LIMIT || 10);
const DAY_NAME_TO_INT = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
};
// Defensive normalization: upstream payloads can carry dayOfWeek as an Int
// (from availability-service), a numeric string ("1"), a day name ("Monday"),
// or — due to JSON quirks — NaN / null / undefined. The matching-service
// Prisma schema expects Int (0-6). Returns null for anything we cannot
// convert so the caller can drop that slot.
const normalizeDayOfWeek = (raw) => {
    if (typeof raw === "number" && Number.isFinite(raw) && Number.isInteger(raw) && raw >= 0 && raw <= 6) {
        return raw;
    }
    if (typeof raw === "string") {
        const trimmed = raw.trim().toLowerCase();
        if (!trimmed || trimmed === "nan" || trimmed === "undefined" || trimmed === "null")
            return null;
        if (trimmed in DAY_NAME_TO_INT)
            return DAY_NAME_TO_INT[trimmed];
        const asNum = Number(trimmed);
        if (Number.isInteger(asNum) && asNum >= 0 && asNum <= 6)
            return asNum;
    }
    return null;
};
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
            const cleanedSlots = [];
            for (const slot of payload.availability) {
                const dow = normalizeDayOfWeek(slot.dayOfWeek);
                if (dow === null || !slot.startTime || !slot.endTime)
                    continue;
                cleanedSlots.push({
                    userId: payload.userId,
                    dayOfWeek: dow,
                    startTime: slot.startTime,
                    endTime: slot.endTime
                });
            }
            if (cleanedSlots.length !== payload.availability.length) {
                console.warn(`[matching-service] replaceAvailability: dropped ${payload.availability.length - cleanedSlots.length} invalid slot(s) for user ${payload.userId}`);
            }
            if (cleanedSlots.length > 0) {
                await tx.availabilitySlot.createMany({ data: cleanedSlots });
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
    async updateProfile(userId, data) {
        return prisma_js_1.prisma.matchProfile.update({
            where: { userId },
            data: {
                studyPace: data.studyPace,
                studyMode: data.studyMode,
                groupSize: data.groupSize,
                studyStyle: data.studyStyle,
                // preferredTimes and sessionLength are not in your MatchProfile model?
                // If they are missing, you need to add them to the Prisma schema.
                // For now, just ignore them or store somewhere else.
            },
        });
    }
}
exports.MatchingService = MatchingService;
exports.matchingService = new MatchingService();
