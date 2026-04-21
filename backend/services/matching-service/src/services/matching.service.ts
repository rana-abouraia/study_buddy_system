import { prisma } from "../db/prisma.js";
import { calculateCompatibility } from "./scoring.service.js";
import { publishMatchFoundEvent } from "../kafka/producer.js";
import type {
  ReplaceAvailabilityInput,
  UpsertPreferencesInput
} from "../types/events.js";

const MATCH_MIN_SCORE = Number(process.env.MATCH_MIN_SCORE || 10);
const TOP_MATCH_LIMIT = Number(process.env.TOP_MATCH_LIMIT || 10);

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
        compatibilityScore: match.compatibility,
        reasons: match.reasons
      });
    }

    return rankedMatches;
  }

  async getRecommendedMatches(userId: string, limit = 10) {
    return prisma.matchResult.findMany({
      where: { userId },
      orderBy: [
        { compatibility: "desc" },
        { candidateUserId: "asc" }
      ],
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