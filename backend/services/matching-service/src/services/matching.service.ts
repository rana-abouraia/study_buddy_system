import { prisma } from '../db/prisma.js';
import { calculateCompatibility } from './scoring.service.js';
import { publishMatchFoundEvent } from '../kafka/producer.js';
import type {
<<<<<<< HEAD
  AvailabilityUpdatedPayload,
  UserCreatedPayload,
  UserPreferencesUpdatedPayload
} from '../types/events.js';
=======
  ReplaceAvailabilityInput,
  UpsertPreferencesInput
} from "../types/events.js";
>>>>>>> main

const MATCH_MIN_SCORE = Number(process.env.MATCH_MIN_SCORE || 10);
const TOP_MATCH_LIMIT = Number(process.env.TOP_MATCH_LIMIT || 10);

const DAY_NAME_TO_INT: Record<string, number> = {
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
const normalizeDayOfWeek = (raw: unknown): number | null => {
  if (typeof raw === "number" && Number.isFinite(raw) && Number.isInteger(raw) && raw >= 0 && raw <= 6) {
    return raw;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed || trimmed === "nan" || trimmed === "undefined" || trimmed === "null") return null;
    if (trimmed in DAY_NAME_TO_INT) return DAY_NAME_TO_INT[trimmed];
    const asNum = Number(trimmed);
    if (Number.isInteger(asNum) && asNum >= 0 && asNum <= 6) return asNum;
  }
  return null;
};

type RankedMatch = {
  candidateUserId: string;
  compatibility: number;
  reasons: string[];
};

export class MatchingService {
  async upsertPreferences(payload: UpsertPreferencesInput) {
    await prisma.matchProfile.upsert({
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

  async replaceAvailability(payload: ReplaceAvailabilityInput) {
    await prisma.matchProfile.upsert({
      where: { userId: payload.userId },
      update: {},
      create: {
        userId: payload.userId,
        courses: [],
        topics: []
      }
    });

    await prisma.$transaction(async (tx) => {
      await tx.availabilitySlot.deleteMany({
        where: { userId: payload.userId }
      });

<<<<<<< HEAD
      if (payload.availability.length) {
        await tx.availabilitySlot.createMany({
          data: payload.availability.map((slot) => ({
            userId: payload.userId,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime
          }))
        });
      }
=======
      type CleanedSlot = {
        userId: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
      };

      const cleanedSlots: CleanedSlot[] = [];
      for (const slot of payload.availability) {
        const dow = normalizeDayOfWeek((slot as { dayOfWeek: unknown }).dayOfWeek);
        if (dow === null || !slot.startTime || !slot.endTime) continue;
        cleanedSlots.push({
          userId: payload.userId,
          dayOfWeek: dow,
          startTime: slot.startTime,
          endTime: slot.endTime
        });
      }

      if (cleanedSlots.length !== payload.availability.length) {
        console.warn(
          `[matching-service] replaceAvailability: dropped ${
            payload.availability.length - cleanedSlots.length
          } invalid slot(s) for user ${payload.userId}`
        );
      }

      if (cleanedSlots.length > 0) {
        await tx.availabilitySlot.createMany({ data: cleanedSlots });
      }
>>>>>>> main
    });

    await this.recalculateMatchesForUser(payload.userId);
  }

  private async loadUserWithAvailability(userId: string) {
    return prisma.matchProfile.findUnique({
      where: { userId },
      include: { availabilitySlots: true }
    });
  }

  private async loadCandidates(userId: string) {
    return prisma.matchProfile.findMany({
      where: {
        userId: { not: userId }
      },
      include: { availabilitySlots: true }
    });
  }

  private rankCandidates(
    user: Awaited<ReturnType<MatchingService["loadUserWithAvailability"]>> extends infer T
      ? NonNullable<T>
      : never,
    candidates: Awaited<ReturnType<MatchingService["loadCandidates"]>>
  ): RankedMatch[] {
    const ranked: RankedMatch[] = [];

    for (const candidate of candidates) {
      const result = calculateCompatibility(user, candidate);

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

  async recalculateMatchesForUser(userId: string) {
    const user = await this.loadUserWithAvailability(userId);

    if (!user) {
      throw new Error(`User ${userId} not found in matching service`);
    }

    const candidates = await this.loadCandidates(userId);

    await prisma.matchResult.deleteMany({
      where: {
        OR: [
          { userId },
          { candidateUserId: userId }
        ]
      }
    });

    const rankedMatches = this.rankCandidates(user, candidates);

    for (const match of rankedMatches) {
      await prisma.matchResult.upsert({
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

      await prisma.matchResult.upsert({
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

      await publishMatchFoundEvent({
        userId,
        matchedUserId: match.candidateUserId,
        userIds: [userId],
        compatibilityScore: match.compatibility,
        reasons: match.reasons
      });
    }

    return rankedMatches;
  }

  async getRecommendedMatches(userId: string, limit = 10) {
    return prisma.matchResult.findMany({
      where: { userId },
<<<<<<< HEAD
      orderBy: { compatibility: 'desc' },
=======
      orderBy: [
        { compatibility: "desc" },
        { candidateUserId: "asc" }
      ],
>>>>>>> main
      take: limit
    });
  }

  async getMatchProfile(userId: string) {
    return prisma.matchProfile.findUnique({
      where: { userId },
      include: { availabilitySlots: true }
    });
  }
}

export const matchingService = new MatchingService();
