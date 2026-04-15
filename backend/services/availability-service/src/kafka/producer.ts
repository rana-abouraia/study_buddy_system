import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';

dotenv.config();

const kafka = new Kafka({
  clientId: 'availability-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092']
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
            producerService: 'availability-service',
            correlationId: Math.random().toString(36).substring(7),
            payload
          })
        }
      ]
    });
    await producer.disconnect();
    console.log(`📨 Event published to topic: ${topic}`);
  } catch (error) {
    console.error(`❌ Failed to publish event:`, error);
  }
};