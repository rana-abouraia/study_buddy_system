import { Kafka } from 'kafkajs';
import { TOPICS } from './topics.js';
import { matchingService } from '../services/matching.service.js';
import type {
  BaseEvent,
  AvailabilityUpdatedPayload,
  UserPreferencesUpdatedPayload
} from '../types/events.js';

const brokers = process.env.KAFKA_BROKERS
  ? process.env.KAFKA_BROKERS.split(",").map((b) => b.trim())
  : process.env.KAFKA_BROKER
    ? process.env.KAFKA_BROKER.split(",").map((b) => b.trim())
    : [];

    
const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'matching-service',
  brokers
});

const consumer = kafka.consumer({
  groupId: 'matching-service-group'
});

function parseGroupSize(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();
    const groupSizeMap: Record<string, number> = {
      ONE_ON_ONE: 2,
      SMALL: 4,
      LARGE: 8
    };

    if (normalized in groupSizeMap) return groupSizeMap[normalized];

    const match = value.match(/\d+/);
    if (match) {
      const n = parseInt(match[0], 10);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

function parseStudyStyle(value: unknown): string | null {
  if (!Array.isArray(value)) return null;

  const styles = value
    .map((style) => (typeof style === "string" ? style.trim() : ""))
    .filter((style) => style.length > 0);

  return styles.length > 0 ? styles.join(",") : null;
}

function mapDayOfWeek(day: number | string): string {
  if (typeof day === "string") return day;
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];

  return days[day] ?? String(day);
}

export async function startConsumer() {
  if (brokers.length === 0) {
    console.log("[matching-service] Kafka consumer disabled");
    return;
  }

  await consumer.connect();
  await consumer.subscribe({
    topic: TOPICS.USER_PREFERENCES_UPDATED,
    fromBeginning: false
  });

  await consumer.subscribe({
    topic: TOPICS.AVAILABILITY_UPDATED,
    fromBeginning: false
  });

  console.log('[matching-service] Kafka consumer connected');

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const rawValue = message.value?.toString();
        if (!rawValue) return;

        const parsed = JSON.parse(rawValue);

        if (topic === TOPICS.USER_PREFERENCES_UPDATED) {
          const event = parsed as BaseEvent<UserPreferencesUpdatedPayload>;
          const payload = event.payload;

          await matchingService.upsertPreferences({
            userId: payload.userId,
            courses: payload.courses?.map((course) => course.name) ?? [],
            topics: payload.topics?.map((topic) => topic.name) ?? [],
            studyPace: payload.studyPace ?? null,
            studyMode: payload.studyMode ?? null,
            groupSize: parseGroupSize(payload.groupSize),
            studyStyle: parseStudyStyle(payload.studyStyles)
          });
          await matchingService.recalculateMatchesForUser(payload.userId);

          console.log(
            `[matching-service] handled ${topic} for user ${payload.userId}`
          );
          return;
        }

        if (topic === TOPICS.AVAILABILITY_UPDATED) {
          const event = parsed as BaseEvent<AvailabilityUpdatedPayload>;
          const payload = event.payload;

          // New snapshot-style payload: { userId, slots: [...] }
          if (Array.isArray(payload.slots)) {
            await matchingService.replaceAvailability({
              userId: payload.userId,
              availability: payload.slots.map((slot) => ({
                dayOfWeek: mapDayOfWeek(slot.dayOfWeek),
                startTime: slot.startTime,
                endTime: slot.endTime
              }))
            });

            console.log(
              `[matching-service] handled ${topic} snapshot for user ${payload.userId} (${payload.slots.length} slots)`
            );
            return;
          }

          // Legacy per-action payload fallback (kept for backward-compat only)
          if (payload.action === "DELETED") {
            await matchingService.replaceAvailability({
              userId: payload.userId,
              availability: []
            });
          } else if (payload.slot) {
            await matchingService.replaceAvailability({
              userId: payload.userId,
              availability: [
                {
                  dayOfWeek: mapDayOfWeek(payload.slot.dayOfWeek),
                  startTime: payload.slot.startTime,
                  endTime: payload.slot.endTime
                }
              ]
            });
          }

          console.log(
            `[matching-service] handled ${topic} for user ${payload.userId}`
          );
          return;
        }

        console.warn(`[matching-service] unhandled topic ${topic}`);
      } catch (error) {
        console.error('[matching-service] consumer error:', error);
      }
    }
  });
}
