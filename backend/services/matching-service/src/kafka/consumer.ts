import { Kafka } from "kafkajs";
import { TOPICS } from "./topics.js";
import { matchingService } from "../services/matching.service.js";
import type {
  BaseEvent,
  AvailabilityUpdatedPayload,
  UserPreferencesUpdatedPayload
} from "../types/events.js";

const brokers = (process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || "kafka:9092")
  .split(",")
  .map((b) => b.trim());

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || "matching-service",
  brokers
});

const consumer = kafka.consumer({
  groupId: "matching-service-group"
});

function mapDayOfWeek(day: number): string {
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
  await consumer.connect();

  await consumer.subscribe({
    topic: TOPICS.USER_PREFERENCES_UPDATED,
    fromBeginning: false
  });

  await consumer.subscribe({
    topic: TOPICS.AVAILABILITY_UPDATED,
    fromBeginning: false
  });

  console.log("[matching-service] Kafka consumer connected");

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
            groupSize:
              payload.groupSize && !Number.isNaN(Number(payload.groupSize))
                ? Number(payload.groupSize)
                : null,
            studyStyle: payload.studyStyles?.[0] ?? null
          });

          console.log(
            `[matching-service] handled ${topic} for user ${payload.userId}`
          );
          return;
        }

        if (topic === TOPICS.AVAILABILITY_UPDATED) {
          const event = parsed as BaseEvent<AvailabilityUpdatedPayload>;
          const payload = event.payload;

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
        console.error("[matching-service] consumer error:", error);
      }
    }
  });
}