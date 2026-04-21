import path from 'path';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import { Kafka } from 'kafkajs';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const kafka = new Kafka({
  clientId: 'profile-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
});

const producer = kafka.producer();
let connected = false;

const ensureConnected = async () => {
  if (!connected) {
    await producer.connect();
    connected = true;
  }
};

export const publishEvent = async (topic: string, payload: object) => {
  try {
    await ensureConnected();
    await producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify({
            eventName: topic,
            timestamp: new Date().toISOString(),
            producerService: 'profile-service',
            correlationId: randomUUID(),
            payload,
          }),
        },
      ],
    });
    console.log(`Event published to topic: ${topic}`);
  } catch (error) {
    console.error(`Failed to publish event to topic ${topic}:`, error);
  }
};
