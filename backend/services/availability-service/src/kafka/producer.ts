import { randomUUID } from 'crypto';
import { Kafka } from 'kafkajs';

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
    producerService: 'availability-service',
    correlationId,
    payload,
  };

  try {
    await connectProducer();
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(event) }],
    });
    console.log(`[availability-service] published ${topic}`);
  } catch (error) {
    console.error(`[availability-service] failed to publish ${topic}:`, error);
    throw error;
  }
};
