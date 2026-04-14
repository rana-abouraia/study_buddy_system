import { describe, expect, jest, test, beforeEach } from '@jest/globals';

jest.mock('../../src/db/prisma.js', () => ({
  prisma: {
    matchProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn()
    },
    matchResult: {
      deleteMany: jest.fn(),
      upsert: jest.fn()
    }
  }
}));

jest.mock('../../src/services/scoring.service.js', () => ({
  calculateCompatibility: jest.fn()
}));

jest.mock('../../src/kafka/producer.js', () => ({
  publishMatchFoundEvent: jest.fn()
}));

import { prisma } from '../../src/db/prisma.js';
import { calculateCompatibility } from '../../src/services/scoring.service.js';
import { publishMatchFoundEvent } from '../../src/kafka/producer.js';
import { MatchingService } from '../../src/services/matching.service';

const mockPrisma = prisma as any;
const mockCalculateCompatibility = calculateCompatibility as jest.Mock;
const mockPublishMatchFoundEvent = publishMatchFoundEvent as jest.Mock;

describe('MatchingService concurrency', () => {
  let service: MatchingService;

  beforeEach(() => {
    service = new MatchingService();
    jest.clearAllMocks();
  });

  test('should support multiple matching requests simultaneously', async () => {
    mockPrisma.matchProfile.findUnique.mockImplementation(async ({ where }: any) => ({
      userId: where.userId,
      courses: ['Cloud Computing'],
      topics: ['Kafka'],
      studyMode: 'ONLINE',
      studyPace: 'MEDIUM',
      groupSize: 2,
      studyStyle: 'DISCUSSION',
      availabilitySlots: []
    }));

    mockPrisma.matchProfile.findMany.mockImplementation(async ({ where }: any) => [
      {
        userId: `${where.userId.not}-candidate-1`,
        availabilitySlots: []
      },
      {
        userId: `${where.userId.not}-candidate-2`,
        availabilitySlots: []
      }
    ]);

    mockPrisma.matchResult.deleteMany.mockResolvedValue({});
    mockPrisma.matchResult.upsert.mockResolvedValue({});
    mockPublishMatchFoundEvent.mockResolvedValue({});

    mockCalculateCompatibility.mockImplementation((user: any, candidate: any) => ({
      score: candidate.userId.includes('candidate-1') ? 45 : 30,
      reasons: ['Shared courses']
    }));

    const userIds = ['U1', 'U2', 'U3', 'U4', 'U5'];

    const results = await Promise.all(
      userIds.map((userId) => service.recalculateMatchesForUser(userId))
    );

    expect(results).toHaveLength(5);

    for (const result of results) {
      expect(result.length).toBe(2);
      expect(result[0].compatibility).toBeGreaterThanOrEqual(result[1].compatibility);
    }

    expect(mockPrisma.matchResult.upsert).toHaveBeenCalled();
    expect(mockPublishMatchFoundEvent).toHaveBeenCalled();
  });
});