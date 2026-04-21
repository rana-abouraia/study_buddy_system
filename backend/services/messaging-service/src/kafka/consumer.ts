import { PrismaClient } from '@prisma/client';
import { Kafka, Consumer } from 'kafkajs';

const TOPICS = ['match-found', 'buddy-request-accepted'];

let consumer: Consumer | null = null;

const toPair = (a: string, b: string): [string, string] =>
  a < b ? [a, b] : [b, a];

export const startMessagingConsumer = async (prisma: PrismaClient) => {
  if (consumer) return consumer;

  const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'messaging-service',
    brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
  });

  consumer = kafka.consumer({
    groupId: process.env.KAFKA_GROUP_ID || 'messaging-service-group',
  });

  await consumer.connect();
  for (const topic of TOPICS) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        if (!message.value) return;
        const parsed = JSON.parse(message.value.toString());
        const payload = parsed.payload || {};
        let a: string | undefined;
        let b: string | undefined;
        let source = 'UNKNOWN';

        if (topic === 'match-found') {
          a = payload.userId;
          b = payload.matchedUserId;
          source = 'MATCH';
        } else if (topic === 'buddy-request-accepted') {
          a = payload.senderId;
          b = payload.receiverId;
          source = 'BUDDY_REQUEST';
        }

        if (!a || !b || a === b) return;
        const [userA, userB] = toPair(a, b);

        await prisma.connection.upsert({
          where: { userA_userB: { userA, userB } },
          create: { userA, userB, source },
          update: {}, // idempotent
        });
      } catch (error) {
        console.error(`[messaging-service] consumer error for ${topic}:`, error);
      }
    },
  });

  console.log(`[messaging-service] Kafka consumer listening to: ${TOPICS.join(', ')}`);
  return consumer;
};
