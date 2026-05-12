"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishEvent = void 0;
const kafkajs_1 = require("kafkajs");
const crypto_1 = require("crypto");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const kafka = new kafkajs_1.Kafka({
    clientId: 'session-service',
    brokers: [process.env.KAFKA_BROKER || 'kafka:9092']
});
const producer = kafka.producer();
let connected = false;
const ensureConnected = async () => {
    if (!connected) {
        await producer.connect();
        connected = true;
    }
};
const publishEvent = async (topic, payload) => {
    try {
        await ensureConnected();
        await producer.send({
            topic,
            messages: [
                {
                    value: JSON.stringify({
                        eventName: topic,
                        timestamp: new Date().toISOString(),
                        producerService: 'session-service',
                        correlationId: (0, crypto_1.randomUUID)(),
                        payload
                    })
                }
            ]
        });
        console.log(`📨 Event published to topic: ${topic}`);
    }
    catch (error) {
        console.error(`❌ Failed to publish event:`, error);
    }
};
exports.publishEvent = publishEvent;
