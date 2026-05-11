import { randomUUID } from 'crypto';
import { Kafka } from 'kafkajs';
<<<<<<< HEAD
=======
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
>>>>>>> main

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
  clientId: 'messaging-service',
  brokers,
});

const producer = kafka.producer();
<<<<<<< HEAD
let producerConnected = false;

const connectProducer = async () => {
  if (!producerConnected) {
    await producer.connect();
    producerConnected = true;
  }
};

export const publishEvent = async <TPayload>(
  topic: string,
  payload: TPayload,
  correlationId = randomUUID(),
) => {
  const event: KafkaEventEnvelope<TPayload> = {
    eventName: topic,
    timestamp: new Date().toISOString(),
    producerService: 'messaging-service',
    correlationId,
    payload,
  };

  try {
    await connectProducer();
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(event) }],
    });
    console.log(`[messaging-service] published ${topic}`);
=======
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
            producerService: 'messaging-service',
            correlationId: randomUUID(),
            payload
          })
        }
      ]
    });
    console.log(`📨 Event published to topic: ${topic}`);
>>>>>>> main
  } catch (error) {
    console.error(`[messaging-service] failed to publish ${topic}:`, error);
    throw error;
  }
};
