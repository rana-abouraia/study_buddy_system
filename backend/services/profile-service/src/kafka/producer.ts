import path from 'path';
import dotenv from 'dotenv';
import { Kafka } from 'kafkajs';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const kafka = new Kafka({
  clientId: 'profile-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
});

const producer = kafka.producer();

export const publishEvent = async (topic: string, payload: object) => {
  try {
    await producer.connect();
    await producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify({
            eventName: topic,
            timestamp: new Date().toISOString(),
            producerService: 'profile-service',
            correlationId: Math.random().toString(36).slice(2),
            payload,
          }),
        },
      ],
    });
    await producer.disconnect();
    console.log(`Event published to topic: ${topic}`);
  } catch (error) {
    console.error(`Failed to publish event to topic ${topic}:`, error);
  }
};
