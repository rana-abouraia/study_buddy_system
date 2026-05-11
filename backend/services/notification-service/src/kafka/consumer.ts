import { PrismaClient } from '@prisma/client';
import { Admin, Consumer, Kafka } from 'kafkajs';
import { mapEventToNotifications } from './notification-mapper';
import { KafkaEventEnvelope } from './types';

const DEFAULT_TOPICS = [
  'match-found',
  'buddy-request-received',
  'buddy-request-accepted',
  'session-invitation-received',
  'study-session-invitation',
  'session-reminder',
  'study-session-reminder',
  'session-upcoming',
  'study-session-created',
  'study-session-joined',
  'study-session-cancelled',
  'notification-created',
];

const getTopics = () => {
  const configuredTopics = process.env.NOTIFICATION_TOPICS
    ?.split(',')
    .map((topic) => topic.trim())
    .filter(Boolean);

  return configuredTopics?.length ? configuredTopics : DEFAULT_TOPICS;
};

const brokers = (process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || 'kafka:9092')
  .split(',')
  .map((broker) => broker.trim())
  .filter(Boolean);

let consumer: Consumer | null = null;
let admin: Admin | null = null;

export const startNotificationConsumer = async (prisma: PrismaClient) => {
  if (consumer) {
    return consumer;
  }

  const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
    brokers,
  });

  consumer = kafka.consumer({
    groupId: process.env.KAFKA_GROUP_ID || 'notification-service-group',
  });
  admin = kafka.admin();

  const topics = getTopics();

  await admin.connect();
  await admin.createTopics({
    waitForLeaders: true,
    topics: topics.map((topic) => ({
      topic,
      numPartitions: 1,
      replicationFactor: 1,
    })),
  });
  await admin.disconnect();

  await consumer.connect();

  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        if (!message.value) {
          return;
        }

        const parsed = JSON.parse(message.value.toString()) as KafkaEventEnvelope;
        const notifications = mapEventToNotifications(topic, parsed);

        if (!notifications.length) {
          console.warn(`No notification recipients could be derived for topic "${topic}".`);
          return;
        }

        await prisma.notification.createMany({
          data: notifications,
        });

        console.log(
          `Stored ${notifications.length} notification(s) from topic "${topic}" for ${notifications
            .map((notification) => notification.userId)
            .join(', ')}.`,
        );
      } catch (error) {
        console.error(`Failed to process Kafka message from topic "${topic}":`, error);
      }
    },
  });

  console.log(`Notification consumer is listening to topics: ${topics.join(', ')}`);

  return consumer;
};
