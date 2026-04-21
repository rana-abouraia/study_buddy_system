"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishEvent = void 0;
const crypto_1 = require("crypto");
const kafkajs_1 = require("kafkajs");
const brokers = (process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || 'kafka:9092')
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean);
const kafka = new kafkajs_1.Kafka({
    clientId: 'messaging-service',
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
const publishEvent = async (topic, payload, correlationId = (0, crypto_1.randomUUID)()) => {
    const event = {
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
    }
    catch (error) {
        console.error(`[messaging-service] failed to publish ${topic}:`, error);
        throw error;
    }
};
exports.publishEvent = publishEvent;
