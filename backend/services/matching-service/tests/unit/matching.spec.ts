import { describe, expect, test } from '@jest/globals';
import { calculateCompatibility } from '../../src/services/scoring.service';

describe('Matching Logic', () => {
  test('users with shared course should have higher score', () => {
    const userA = {
      courses: ['Cloud Computing', 'Database'],
      topics: ['Kafka'],
      availabilitySlots: [],
      studyMode: 'ONLINE',
      studyPace: 'MEDIUM',
      groupSize: 2,
      studyStyle: 'DISCUSSION'
    };

    const userB = {
      courses: ['Cloud Computing'],
      topics: ['OOP'],
      availabilitySlots: [],
      studyMode: 'ONLINE',
      studyPace: 'MEDIUM',
      groupSize: 2,
      studyStyle: 'DISCUSSION'
    };

    const result = calculateCompatibility(userA as any, userB as any);

    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons).toContain('Shared courses (1)');
  });

  test('users with no shared data should have lower score', () => {
    const userA = {
      courses: ['Cloud Computing'],
      topics: ['Kafka'],
      availabilitySlots: [],
      studyMode: 'ONLINE',
      studyPace: 'MEDIUM',
      groupSize: 2,
      studyStyle: 'DISCUSSION'
    };

    const userB = {
      courses: ['Math'],
      topics: ['Calculus'],
      availabilitySlots: [],
      studyMode: 'IN_PERSON',
      studyPace: 'SLOW',
      groupSize: 5,
      studyStyle: 'QUIET'
    };

    const result = calculateCompatibility(userA as any, userB as any);

    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  test('users with overlapping availability should get score', () => {
    const userA = {
      courses: [],
      topics: [],
      availabilitySlots: [
        {
          dayOfWeek: 'Monday',
          startTime: '10:00',
          endTime: '12:00'
        }
      ],
      studyMode: null,
      studyPace: null,
      groupSize: null,
      studyStyle: null
    };

    const userB = {
      courses: [],
      topics: [],
      availabilitySlots: [
        {
          dayOfWeek: 'Monday',
          startTime: '11:00',
          endTime: '13:00'
        }
      ],
      studyMode: null,
      studyPace: null,
      groupSize: null,
      studyStyle: null
    };

    const result = calculateCompatibility(userA as any, userB as any);

    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons[0]).toContain('Overlapping availability');
  });

  test('same preferences should increase score', () => {
    const userA = {
      courses: [],
      topics: [],
      availabilitySlots: [],
      studyMode: 'ONLINE',
      studyPace: 'MEDIUM',
      groupSize: 2,
      studyStyle: 'DISCUSSION'
    };

    const userB = {
      courses: [],
      topics: [],
      availabilitySlots: [],
      studyMode: 'ONLINE',
      studyPace: 'MEDIUM',
      groupSize: 2,
      studyStyle: 'DISCUSSION'
    };

    const result = calculateCompatibility(userA as any, userB as any);

    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons).toContain('Same study mode');
    expect(result.reasons).toContain('Same study pace');
    expect(result.reasons).toContain('Same study style');
    expect(result.reasons).toContain('Same preferred group size');
  });

  test('exact time boundary should not count as overlap', () => {
    const userA = {
      courses: [],
      topics: [],
      availabilitySlots: [
        {
          dayOfWeek: 'Monday',
          startTime: '10:00',
          endTime: '12:00'
        }
      ],
      studyMode: null,
      studyPace: null,
      groupSize: null,
      studyStyle: null
    };

    const userB = {
      courses: [],
      topics: [],
      availabilitySlots: [
        {
          dayOfWeek: 'Monday',
          startTime: '12:00',
          endTime: '14:00'
        }
      ],
      studyMode: null,
      studyPace: null,
      groupSize: null,
      studyStyle: null
    };

    const result = calculateCompatibility(userA as any, userB as any);

    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  test('same input should always return the same score and reasons', () => {
    const userA = {
      courses: ['Cloud Computing', 'Database'],
      topics: ['Kafka'],
      availabilitySlots: [
        {
          dayOfWeek: 'Monday',
          startTime: '10:00',
          endTime: '12:00'
        }
      ],
      studyMode: 'ONLINE',
      studyPace: 'MEDIUM',
      groupSize: 2,
      studyStyle: 'DISCUSSION'
    };

    const userB = {
      courses: ['Cloud Computing', 'Database'],
      topics: ['Kafka'],
      availabilitySlots: [
        {
          dayOfWeek: 'Monday',
          startTime: '11:00',
          endTime: '13:00'
        }
      ],
      studyMode: 'ONLINE',
      studyPace: 'MEDIUM',
      groupSize: 2,
      studyStyle: 'DISCUSSION'
    };

    const result1 = calculateCompatibility(userA as any, userB as any);
    const result2 = calculateCompatibility(userA as any, userB as any);
    const result3 = calculateCompatibility(userA as any, userB as any);

    expect(result1.score).toBe(result2.score);
    expect(result2.score).toBe(result3.score);
    expect(result1.reasons).toEqual(result2.reasons);
    expect(result2.reasons).toEqual(result3.reasons);
  });

  test('score should never exceed 100', () => {
    const userA = {
      courses: ['A', 'B', 'C', 'D', 'E'],
      topics: ['T1', 'T2', 'T3', 'T4', 'T5'],
      availabilitySlots: [
        {
          dayOfWeek: 'Monday',
          startTime: '08:00',
          endTime: '14:00'
        }
      ],
      studyMode: 'ONLINE',
      studyPace: 'FAST',
      groupSize: 2,
      studyStyle: 'DISCUSSION'
    };

    const userB = {
      courses: ['A', 'B', 'C', 'D', 'E'],
      topics: ['T1', 'T2', 'T3', 'T4', 'T5'],
      availabilitySlots: [
        {
          dayOfWeek: 'Monday',
          startTime: '08:00',
          endTime: '14:00'
        }
      ],
      studyMode: 'ONLINE',
      studyPace: 'FAST',
      groupSize: 2,
      studyStyle: 'DISCUSSION'
    };

    const result = calculateCompatibility(userA as any, userB as any);

    expect(result.score).toBeLessThanOrEqual(100);
  });
});