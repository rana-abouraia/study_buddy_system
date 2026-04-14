import { Kafka } from "kafkajs";
import { TOPICS } from "./topics.js";
import { matchingService } from "../services/matching.service.js";
import type {
  BaseEvent,
  AvailabilityUpdatedPayload,
  UserCreatedPayload,
  UserPreferencesUpdatedPayload
} from "../types/events.js";

const brokers = (process.env.KAFKA_BROKERS || "localhost:9092")
  .split(",")
  .map((b) => b.trim());

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || "matching-service",
  brokers
});

const consumer = kafka.consumer({
  groupId: "matching-service-group"
});

export async function startConsumer() {
  await consumer.connect();

  await consumer.subscribe({ topic: TOPICS.USER_CREATED, fromBeginning: false });
  await consumer.subscribe({ topic: TOPICS.USER_PREFERENCES_UPDATED, fromBeginning: false });
  await consumer.subscribe({ topic: TOPICS.AVAILABILITY_UPDATED, fromBeginning: false });

  console.log("[matching-service] Kafka consumer connected");

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const rawValue = message.value?.toString();
        if (!rawValue) return;

        const parsed = JSON.parse(rawValue);

        switch (topic) {
          case TOPICS.USER_CREATED: {
            const event = parsed as BaseEvent<UserCreatedPayload>;
            await matchingService.ensureUserExists(event.payload);
            console.log(`[matching-service] handled ${topic} for user ${event.payload.userId}`);
            break;
          }

          case TOPICS.USER_PREFERENCES_UPDATED: {
            const event = parsed as BaseEvent<UserPreferencesUpdatedPayload>;
            await matchingService.upsertPreferences(event.payload);
            console.log(`[matching-service] handled ${topic} for user ${event.payload.userId}`);
            break;
          }

          case TOPICS.AVAILABILITY_UPDATED: {
            const event = parsed as BaseEvent<AvailabilityUpdatedPayload>;
            await matchingService.replaceAvailability(event.payload);
            console.log(`[matching-service] handled ${topic} for user ${event.payload.userId}`);
            break;
          }

          default:
            console.warn(`[matching-service] unhandled topic ${topic}`);
        }
      } catch (error) {
        console.error("[matching-service] consumer error:", error);
      }
    }
  });
}