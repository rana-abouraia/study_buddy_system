import { describe, expect, jest, test, beforeEach } from '@jest/globals';

jest.mock('../../src/db/prisma.js', () => ({
  prisma: {
    matchProfile: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn()
    },
    availabilitySlot: {
      deleteMany: jest.fn(),
      createMany: jest.fn()
    },
    matchResult: {
      deleteMany: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn()
    },
    $transaction: jest.fn()
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

describe('MatchingService', () => {
  let service: MatchingService;

  beforeEach(() => {
    service = new MatchingService();
    jest.clearAllMocks();
  });

  test('ensureUserExists should upsert a match profile', async () => {
    mockPrisma.matchProfile.upsert.mockResolvedValue({
      userId: 'user-1'
    });

    await service.ensureUserExists({ userId: 'user-1' } as any);

    expect(mockPrisma.matchProfile.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      update: {},
      create: {
        userId: 'user-1',
        courses: [],
        topics: []
      }
    });
  });

  test('recalculateMatchesForUser should throw if user is not found', async () => {
    mockPrisma.matchProfile.findUnique.mockResolvedValue(null);

    await expect(service.recalculateMatchesForUser('missing-user')).rejects.toThrow(
      'User missing-user not found in matching service'
    );
  });

  test('recalculateMatchesForUser should exclude low-score matches', async () => {
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

    mockPrisma.matchProfile.findMany.mockResolvedValue([
      {
        userId: 'B',
        courses: ['Math'],
        topics: ['Calculus'],
        studyMode: 'IN_PERSON',
        studyPace: 'SLOW',
        groupSize: 5,
        studyStyle: 'QUIET',
        availabilitySlots: []
      }
    ]);

    mockPrisma.matchResult.deleteMany.mockResolvedValue({});
    mockCalculateCompatibility.mockReturnValue({
      score: 10,
      reasons: ['Weak match']
    });

    const result = await service.recalculateMatchesForUser('A');

    expect(result).toEqual([]);
    expect(mockPrisma.matchResult.upsert).not.toHaveBeenCalled();
    expect(mockPublishMatchFoundEvent).not.toHaveBeenCalled();
  });

  test('recalculateMatchesForUser should keep only valid matches above threshold', async () => {
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

    mockPrisma.matchProfile.findMany.mockResolvedValue([
      {
        userId: 'B',
        courses: ['Cloud Computing'],
        topics: ['Kafka'],
        studyMode: 'ONLINE',
        studyPace: 'MEDIUM',
        groupSize: 2,
        studyStyle: 'DISCUSSION',
        availabilitySlots: []
      },
      {
        userId: 'C',
        courses: ['Math'],
        topics: ['Calculus'],
        studyMode: 'IN_PERSON',
        studyPace: 'SLOW',
        groupSize: 5,
        studyStyle: 'QUIET',
        availabilitySlots: []
      }
    ]);

    mockPrisma.matchResult.deleteMany.mockResolvedValue({});
    mockPrisma.matchResult.upsert.mockResolvedValue({});

    mockCalculateCompatibility
      .mockReturnValueOnce({
        score: 40,
        reasons: ['Shared courses', 'Same study mode']
      })
      .mockReturnValueOnce({
        score: 5,
        reasons: []
      });

    const result = await service.recalculateMatchesForUser('A');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      candidateUserId: 'B',
      compatibility: 40,
      reasons: ['Shared courses', 'Same study mode']
    });

    expect(mockPrisma.matchResult.upsert).toHaveBeenCalledTimes(1);
    expect(mockPublishMatchFoundEvent).toHaveBeenCalledTimes(1);
  });

  test('recalculateMatchesForUser should sort matches highest first', async () => {
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

    mockPrisma.matchProfile.findMany.mockResolvedValue([
      {
        userId: 'B',
        availabilitySlots: []
      },
      {
        userId: 'C',
        availabilitySlots: []
      },
      {
        userId: 'D',
        availabilitySlots: []
      }
    ]);

    mockPrisma.matchResult.deleteMany.mockResolvedValue({});
    mockPrisma.matchResult.upsert.mockResolvedValue({});

    mockCalculateCompatibility
      .mockReturnValueOnce({ score: 30, reasons: ['Match B'] })
      .mockReturnValueOnce({ score: 80, reasons: ['Match C'] })
      .mockReturnValueOnce({ score: 50, reasons: ['Match D'] });

    const result = await service.recalculateMatchesForUser('A');

    expect(result).toHaveLength(3);
    expect(result[0].candidateUserId).toBe('C');
    expect(result[1].candidateUserId).toBe('D');
    expect(result[2].candidateUserId).toBe('B');
  });

  test('recalculateMatchesForUser should save match results correctly', async () => {
    mockPrisma.matchProfile.findUnique.mockResolvedValue({
      userId: 'A',
      availabilitySlots: []
    });

    mockPrisma.matchProfile.findMany.mockResolvedValue([
      {
        userId: 'B',
        availabilitySlots: []
      }
    ]);

    mockPrisma.matchResult.deleteMany.mockResolvedValue({});
    mockPrisma.matchResult.upsert.mockResolvedValue({});

    mockCalculateCompatibility.mockReturnValue({
      score: 35,
      reasons: ['Shared topics']
    });

    await service.recalculateMatchesForUser('A');

    expect(mockPrisma.matchResult.upsert).toHaveBeenCalledWith({
      where: {
        userId_candidateUserId: {
          userId: 'A',
          candidateUserId: 'B'
        }
      },
      update: {
        compatibility: 35,
        reasons: ['Shared topics']
      },
      create: {
        userId: 'A',
        candidateUserId: 'B',
        compatibility: 35,
        reasons: ['Shared topics']
      }
    });
  });

  test('recalculateMatchesForUser should publish match event with correct payload', async () => {
    mockPrisma.matchProfile.findUnique.mockResolvedValue({
      userId: 'A',
      availabilitySlots: []
    });

    mockPrisma.matchProfile.findMany.mockResolvedValue([
      {
        userId: 'B',
        availabilitySlots: []
      }
    ]);

    mockPrisma.matchResult.deleteMany.mockResolvedValue({});
    mockPrisma.matchResult.upsert.mockResolvedValue({});

    mockCalculateCompatibility.mockReturnValue({
      score: 45,
      reasons: ['Shared courses', 'Overlapping availability']
    });

    await service.recalculateMatchesForUser('A');

    expect(mockPublishMatchFoundEvent).toHaveBeenCalledWith({
      userId: 'A',
      matchedUserId: 'B',
      userIds: ['A'],
      compatibilityScore: 45,
      reasons: ['Shared courses', 'Overlapping availability']
    });
  });

  test('getRecommendedMatches should query ordered results', async () => {
    mockPrisma.matchResult.findMany.mockResolvedValue([]);

    await service.getRecommendedMatches('A', 5);

    expect(mockPrisma.matchResult.findMany).toHaveBeenCalledWith({
      where: { userId: 'A' },
      orderBy: { compatibility: 'desc' },
      take: 5
    });
  });

  test('getMatchProfile should return user profile with availability slots', async () => {
    mockPrisma.matchProfile.findUnique.mockResolvedValue({
      userId: 'A',
      availabilitySlots: []
    });

    await service.getMatchProfile('A');

    expect(mockPrisma.matchProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: 'A' },
      include: { availabilitySlots: true }
    });
  });

  test('upsertPreferences should save preferences then recalculate', async () => {
    const recalcSpy = jest
      .spyOn(service, 'recalculateMatchesForUser')
      .mockResolvedValue([]);

    mockPrisma.matchProfile.upsert.mockResolvedValue({});

    await service.upsertPreferences({
      userId: 'A',
      courses: ['Cloud Computing'],
      topics: ['Kafka'],
      studyPace: 'MEDIUM',
      studyMode: 'ONLINE',
      groupSize: 2,
      studyStyle: 'DISCUSSION'
    } as any);

    expect(mockPrisma.matchProfile.upsert).toHaveBeenCalled();
    expect(recalcSpy).toHaveBeenCalledWith('A');
  });

  test('replaceAvailability should replace slots and recalculate', async () => {
    const recalcSpy = jest
      .spyOn(service, 'recalculateMatchesForUser')
      .mockResolvedValue([]);

    mockPrisma.matchProfile.upsert.mockResolvedValue({});
    mockPrisma.availabilitySlot.deleteMany.mockResolvedValue({});
    mockPrisma.availabilitySlot.createMany.mockResolvedValue({});
    mockPrisma.$transaction.mockResolvedValue({});

    await service.replaceAvailability({
      userId: 'A',
      availability: [
        {
          dayOfWeek: 'Monday',
          startTime: '10:00',
          endTime: '12:00'
        }
      ]
    } as any);

    expect(mockPrisma.matchProfile.upsert).toHaveBeenCalled();
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(recalcSpy).toHaveBeenCalledWith('A');
  });
});
