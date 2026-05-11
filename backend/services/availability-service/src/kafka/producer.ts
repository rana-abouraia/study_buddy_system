import { randomUUID } from 'crypto';
import { Kafka } from 'kafkajs';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

type KafkaEventEnvelope<TPayload> = {
  eventName: string;
  timestamp: string;
  producerService: string;
  correlationId: string;
  payload: TPayload;
};

const brokers = (process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || 'kafka:9092')
  .split(',')
  .map((broker) => broker.trim())
  .filter(Boolean);

const kafka = new Kafka({
  clientId: 'availability-service',
  brokers,
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
            producerService: 'availability-service',
            correlationId: randomUUID(),
            payload
          })
        }
      ]
    });
    console.log(`📨 Event published to topic: ${topic}`);
  } catch (error) {
    console.error(`[availability-service] failed to publish ${topic}:`, error);
    throw error;
  }
};
