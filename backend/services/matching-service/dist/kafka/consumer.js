"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startConsumer = startConsumer;
const kafkajs_1 = require("kafkajs");
const topics_js_1 = require("./topics.js");
const matching_service_js_1 = require("../services/matching.service.js");
const brokers = (process.env.KAFKA_BROKERS || "kafka:9092")
    .split(",")
    .map((b) => b.trim());
const kafka = new kafkajs_1.Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || "matching-service",
    brokers
});
const consumer = kafka.consumer({
    groupId: "matching-service-group"
});
async function startConsumer() {
    await consumer.connect();
    await consumer.subscribe({ topic: topics_js_1.TOPICS.USER_CREATED, fromBeginning: false });
    await consumer.subscribe({ topic: topics_js_1.TOPICS.USER_PREFERENCES_UPDATED, fromBeginning: false });
    await consumer.subscribe({ topic: topics_js_1.TOPICS.AVAILABILITY_UPDATED, fromBeginning: false });
    console.log("[matching-service] Kafka consumer connected");
    await consumer.run({
        eachMessage: async ({ topic, message }) => {
            try {
                const rawValue = message.value?.toString();
                if (!rawValue)
                    return;
                const parsed = JSON.parse(rawValue);
                switch (topic) {
                    case topics_js_1.TOPICS.USER_CREATED: {
                        const event = parsed;
                        await matching_service_js_1.matchingService.ensureUserExists(event.payload);
                        console.log(`[matching-service] handled ${topic} for user ${event.payload.userId}`);
                        break;
                    }
                    case topics_js_1.TOPICS.USER_PREFERENCES_UPDATED: {
                        const event = parsed;
                        await matching_service_js_1.matchingService.upsertPreferences(event.payload);
                        console.log(`[matching-service] handled ${topic} for user ${event.payload.userId}`);
                        break;
                    }
                    case topics_js_1.TOPICS.AVAILABILITY_UPDATED: {
                        const event = parsed;
                        await matching_service_js_1.matchingService.replaceAvailability(event.payload);
                        console.log(`[matching-service] handled ${topic} for user ${event.payload.userId}`);
                        break;
                    }
                    default:
                        console.warn(`[matching-service] unhandled topic ${topic}`);
                }
            }
            catch (error) {
                console.error("[matching-service] consumer error:", error);
            }
        }
    });
}
