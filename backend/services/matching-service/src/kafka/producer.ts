import { Kafka } from "kafkajs";
import { TOPICS } from "./topics.js";
import type { BaseEvent, MatchFoundPayload } from "../types/events.js";

const brokers = (process.env.KAFKA_BROKERS || "kafka:9092")
  .split(",")
  .map((b) => b.trim());

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || "matching-service",
  brokers
});

const producer = kafka.producer();

let producerConnected = false;

export async function connectProducer() {
  if (!producerConnected) {
    await producer.connect();
    producerConnected = true;
    console.log("[matching-service] Kafka producer connected");
  }
}

export async function publishMatchFoundEvent(payload: MatchFoundPayload) {
  const event: BaseEvent<MatchFoundPayload> = {
    eventName: TOPICS.MATCH_FOUND,
    timestamp: new Date().toISOString(),
    producerService: "matching-service",
    correlationId: crypto.randomUUID(),
    payload
  };

  await producer.send({
    topic: TOPICS.MATCH_FOUND,
    messages: [{ value: JSON.stringify(event) }]
  });
}