import { randomUUID } from "crypto";
import { Kafka } from "kafkajs";
import { TOPICS } from "./topics.js";
import type {
  BaseEvent,
  BuddyRequestAcceptedPayload,
  BuddyRequestReceivedPayload,
  MatchFoundPayload
} from "../types/events.js";

const brokers = process.env.KAFKA_BROKERS
  ? process.env.KAFKA_BROKERS.split(",").map((b) => b.trim())
  : []; 

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || "matching-service",
  brokers
});

const producer = kafka.producer();

let producerConnected = false;
export const kafkaEnabled = brokers.length > 0;

export async function connectProducer() {
   if (!kafkaEnabled) {
    console.log("[matching-service] Kafka producer disabled");
    return;
  }

  if (!producerConnected) {
    await producer.connect();
    producerConnected = true;
    console.log("[matching-service] Kafka producer connected");
  }
}

export async function publishMatchFoundEvent(payload: MatchFoundPayload) {
  if (!kafkaEnabled) {
    console.log("[matching-service] Kafka producer disabled");
    return;
  }

  const event: BaseEvent<MatchFoundPayload> = {
    eventName: TOPICS.MATCH_FOUND,
    timestamp: new Date().toISOString(),
    producerService: "matching-service",
    correlationId: randomUUID(),
    payload
  };

  await producer.send({
    topic: TOPICS.MATCH_FOUND,
    messages: [{ value: JSON.stringify(event) }]
  });
}

export async function publishBuddyRequestReceived(
  
  payload: BuddyRequestReceivedPayload
) {
  if (!kafkaEnabled) {
    console.log("[matching-service] Kafka producer disabled");
    return;
  }

  const event: BaseEvent<BuddyRequestReceivedPayload> = {
    eventName: TOPICS.BUDDY_REQUEST_RECEIVED,
    timestamp: new Date().toISOString(),
    producerService: "matching-service",
    correlationId: randomUUID(),
    payload
  };

  await producer.send({
    topic: TOPICS.BUDDY_REQUEST_RECEIVED,
    messages: [{ value: JSON.stringify(event) }]
  });
}

export async function publishBuddyRequestAccepted(
  payload: BuddyRequestAcceptedPayload
) {
  if (!kafkaEnabled) {
    console.log("[matching-service] Kafka producer disabled");
    return;
  }

  const event: BaseEvent<BuddyRequestAcceptedPayload> = {
    eventName: TOPICS.BUDDY_REQUEST_ACCEPTED,
    timestamp: new Date().toISOString(),
    producerService: "matching-service",
    correlationId: randomUUID(),
    payload
  };

  await producer.send({
    topic: TOPICS.BUDDY_REQUEST_ACCEPTED,
    messages: [{ value: JSON.stringify(event) }]
  });
}