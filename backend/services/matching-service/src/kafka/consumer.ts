import { Kafka } from 'kafkajs';
import { TOPICS } from './topics.js';
import { matchingService } from '../services/matching.service.js';
import type {
  BaseEvent,
  AvailabilityUpdatedPayload,
  UserCreatedPayload,
  UserPreferencesUpdatedPayload
} from '../types/events.js';

const brokers = (process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || 'kafka:9092')
  .split(',')
  .map((broker) => broker.trim())
  .filter(Boolean);

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'matching-service',
  brokers
});

const consumer = kafka.consumer({
  groupId: 'matching-service-group'
});

const TOPIC_LIST = [
  TOPICS.USER_CREATED,
  TOPICS.PROFILE_PREFERENCES_UPDATED,
  TOPICS.AVAILABILITY_UPDATED,
  TOPICS.MATCH_FOUND
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureTopicsExist() {
  const admin = kafka.admin();
  await admin.connect();

  try {
    await admin.createTopics({
      waitForLeaders: true,
      topics: TOPIC_LIST.map((topic) => ({
        topic,
        numPartitions: 1,
        replicationFactor: 1
      }))
    });
  } finally {
    await admin.disconnect();
  }
}

async function ensureTopicsWithRetry(retries = 8, delayMs = 2000) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await ensureTopicsExist();
      return;
    } catch (error) {
      lastError = error;
      console.warn(
        `[matching-service] topic setup failed (${attempt}/${retries}), retrying...`,
        error
      );

      if (attempt < retries) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
}

export async function startConsumer() {
  await sleep(8000);
  await ensureTopicsWithRetry();

  await consumer.connect();
  await consumer.subscribe({ topic: TOPICS.USER_CREATED, fromBeginning: false });
  await consumer.subscribe({ topic: TOPICS.PROFILE_PREFERENCES_UPDATED, fromBeginning: false });
  await consumer.subscribe({ topic: TOPICS.AVAILABILITY_UPDATED, fromBeginning: false });

  console.log('[matching-service] Kafka consumer connected');

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

          case TOPICS.PROFILE_PREFERENCES_UPDATED: {
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
        console.error('[matching-service] consumer error:', error);
      }
    }
  });
}
