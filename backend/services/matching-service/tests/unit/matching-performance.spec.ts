import { describe, expect, jest, test } from '@jest/globals';

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

describe('MatchingService performance', () => {
  test('recalculateMatchesForUser should finish within 3 seconds for moderate dataset', async () => {
    const service = new MatchingService();

    mockPrisma.matchProfile.findUnique.mockResolvedValue({
      userId: 'A',
      courses: ['Cloud Computing'],
      topics: ['Kafka'],
      studyMode: 'ONLINE',
      studyPace: 'MEDIUM',
      groupSize: 2,
      studyStyle: 'DISCUSSION',
      availabilitySlots: []
    });

    const candidates = Array.from({ length: 300 }, (_, i) => ({
      userId: `user-${i}`,
      courses: ['Cloud Computing'],
      topics: ['Kafka'],
      studyMode: 'ONLINE',
      studyPace: 'MEDIUM',
      groupSize: 2,
      studyStyle: 'DISCUSSION',
      availabilitySlots: []
    }));

    mockPrisma.matchProfile.findMany.mockResolvedValue(candidates);
    mockPrisma.matchResult.deleteMany.mockResolvedValue({});
    mockPrisma.matchResult.upsert.mockResolvedValue({});
    mockPublishMatchFoundEvent.mockResolvedValue({});

    mockCalculateCompatibility.mockImplementation(() => ({
      score: 40,
      reasons: ['Shared courses', 'Shared topics']
    }));

    const start = Date.now();
    const result = await service.recalculateMatchesForUser('A');
    const duration = Date.now() - start;

    expect(result.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(3000);
  });
});