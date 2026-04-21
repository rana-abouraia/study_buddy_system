import { prisma } from '../db/prisma.js';
import { calculateCompatibility } from './scoring.service.js';
import { publishMatchFoundEvent } from '../kafka/producer.js';
import type {
  AvailabilityUpdatedPayload,
  UserCreatedPayload,
  UserPreferencesUpdatedPayload
} from '../types/events.js';

const MATCH_MIN_SCORE = Number(process.env.MATCH_MIN_SCORE || 20);
const TOP_MATCH_LIMIT = Number(process.env.TOP_MATCH_LIMIT || 10);

export class MatchingService {
  async ensureUserExists(payload: UserCreatedPayload) {
    await prisma.matchProfile.upsert({
      where: { userId: payload.userId },
      update: {},
      create: {
        userId: payload.userId,
        courses: [],
        topics: []
      }
    });
  }

  async upsertPreferences(payload: UserPreferencesUpdatedPayload) {
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

  async replaceAvailability(payload: AvailabilityUpdatedPayload) {
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
    });

    await this.recalculateMatchesForUser(payload.userId);
  }

  async recalculateMatchesForUser(userId: string) {
    const user = await prisma.matchProfile.findUnique({
      where: { userId },
      include: { availabilitySlots: true }
    });

    if (!user) {
      throw new Error(`User ${userId} not found in matching service`);
    }

    const candidates = await prisma.matchProfile.findMany({
      where: {
        userId: { not: userId }
      },
      include: { availabilitySlots: true }
    });

    await prisma.matchResult.deleteMany({
      where: { userId }
    });

    const validMatches: {
      candidateUserId: string;
      compatibility: number;
      reasons: string[];
    }[] = [];

    for (const candidate of candidates) {
      const result = calculateCompatibility(user, candidate);

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

      await publishMatchFoundEvent({
        userId,
        matchedUserId: match.candidateUserId,
        userIds: [userId],
        compatibilityScore: match.compatibility,
        reasons: match.reasons
      });
    }

    return topMatches;
  }

  async getRecommendedMatches(userId: string, limit = 10) {
    return prisma.matchResult.findMany({
      where: { userId },
      orderBy: { compatibility: 'desc' },
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
