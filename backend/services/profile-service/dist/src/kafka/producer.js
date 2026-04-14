"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectProducer = exports.publishEventInBackground = exports.publishEvent = void 0;
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const kafkajs_1 = require("kafkajs");
dotenv_1.default.config();
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '../../.env') });
const kafka = new kafkajs_1.Kafka({
    clientId: 'profile-service',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    connectionTimeout: Number(process.env.KAFKA_CONNECTION_TIMEOUT_MS) || 1000,
    requestTimeout: Number(process.env.KAFKA_REQUEST_TIMEOUT_MS) || 1500,
});
const producer = kafka.producer();
let producerConnectionPromise = null;
const ensureProducerConnected = async () => {
    if (!producerConnectionPromise) {
        producerConnectionPromise = producer.connect().catch((error) => {
            producerConnectionPromise = null;
            throw error;
        });
    }
    return producerConnectionPromise;
};
const buildEventMessage = (topic, payload) => JSON.stringify({
    eventName: topic,
    timestamp: new Date().toISOString(),
    producerService: 'profile-service',
    correlationId: Math.random().toString(36).slice(2),
    payload,
});
const publishEvent = async (topic, payload) => {
    try {
        await ensureProducerConnected();
        await producer.send({
            topic,
            messages: [{ value: buildEventMessage(topic, payload) }],
        });
        console.log(`Event published to topic: ${topic}`);
    }
    catch (error) {
        console.error(`Failed to publish event to topic ${topic}:`, error);
    }
};
exports.publishEvent = publishEvent;
const publishEventInBackground = (topic, payload) => {
    void (0, exports.publishEvent)(topic, payload);
};
exports.publishEventInBackground = publishEventInBackground;
const disconnectProducer = async () => {
    if (!producerConnectionPromise) {
        return;
    }
    try {
        await producerConnectionPromise;
        await producer.disconnect();
    }
    catch (error) {
        console.error('Failed to disconnect Kafka producer cleanly:', error);
    }
    finally {
        producerConnectionPromise = null;
    }
};
exports.disconnectProducer = disconnectProducer;
