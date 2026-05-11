"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectProducer = connectProducer;
exports.publishMatchFoundEvent = publishMatchFoundEvent;
const crypto_1 = require("crypto");
const kafkajs_1 = require("kafkajs");
const topics_js_1 = require("./topics.js");
const brokers = (process.env.KAFKA_BROKERS || "kafka:9092")
    .split(",")
    .map((b) => b.trim());
const kafka = new kafkajs_1.Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'matching-service',
    brokers
});
const producer = kafka.producer();
let producerConnected = false;
async function connectProducer() {
    if (!producerConnected) {
        await producer.connect();
        producerConnected = true;
        console.log('[matching-service] Kafka producer connected');
    }
}
async function publishMatchFoundEvent(payload) {
    const event = {
        eventName: topics_js_1.TOPICS.MATCH_FOUND,
        timestamp: new Date().toISOString(),
        producerService: "matching-service",
        correlationId: (0, crypto_1.randomUUID)(),
        payload
    };
    await producer.send({
        topic: topics_js_1.TOPICS.MATCH_FOUND,
        messages: [{ value: JSON.stringify(event) }]
    });
}
