"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishEvent = void 0;
const kafkajs_1 = require("kafkajs");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const kafka = new kafkajs_1.Kafka({
    clientId: 'user-service',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});
const producer = kafka.producer();
const publishEvent = async (topic, payload) => {
    try {
        await producer.connect();
        await producer.send({
            topic,
            messages: [
                {
                    value: JSON.stringify({
                        eventName: topic,
                        timestamp: new Date().toISOString(),
                        producerService: 'user-service',
                        correlationId: Math.random().toString(36).substring(7),
                        payload
                    })
                }
            ]
        });
        await producer.disconnect();
        console.log(`📨 Event published to topic: ${topic}`);
    }
    catch (error) {
        console.error(`❌ Failed to publish event to topic ${topic}:`, error);
    }
};
exports.publishEvent = publishEvent;
