"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startConsumer = startConsumer;
const kafkajs_1 = require("kafkajs");
const topics_js_1 = require("./topics.js");
const matching_service_js_1 = require("../services/matching.service.js");
const brokers = (process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || "kafka:9092")
    .split(",")
    .map((b) => b.trim());
const kafka = new kafkajs_1.Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || "matching-service",
    brokers
});
const consumer = kafka.consumer({
    groupId: "matching-service-group"
});
function parseGroupSize(value) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string") {
        const normalized = value.trim().toUpperCase();
        const groupSizeMap = {
            ONE_ON_ONE: 2,
            SMALL: 4,
            LARGE: 8
        };
        if (normalized in groupSizeMap)
            return groupSizeMap[normalized];
        const match = value.match(/\d+/);
        if (match) {
            const n = parseInt(match[0], 10);
            return Number.isFinite(n) ? n : null;
        }
    }
    return null;
}
function parseStudyStyle(value) {
    if (!Array.isArray(value))
        return null;
    const styles = value
        .map((style) => (typeof style === "string" ? style.trim() : ""))
        .filter((style) => style.length > 0);
    return styles.length > 0 ? styles.join(",") : null;
}
function mapDayOfWeek(day) {
    if (typeof day === "string")
        return day;
    const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ];
    return days[day] ?? String(day);
}
async function startConsumer() {
    await consumer.connect();
    await consumer.subscribe({
        topic: topics_js_1.TOPICS.USER_PREFERENCES_UPDATED,
        fromBeginning: false
    });
    await consumer.subscribe({
        topic: topics_js_1.TOPICS.AVAILABILITY_UPDATED,
        fromBeginning: false
    });
    console.log("[matching-service] Kafka consumer connected");
    await consumer.run({
        eachMessage: async ({ topic, message }) => {
            try {
                const rawValue = message.value?.toString();
                if (!rawValue)
                    return;
                const parsed = JSON.parse(rawValue);
                if (topic === topics_js_1.TOPICS.USER_PREFERENCES_UPDATED) {
                    const event = parsed;
                    const payload = event.payload;
                    await matching_service_js_1.matchingService.upsertPreferences({
                        userId: payload.userId,
                        courses: payload.courses?.map((course) => course.name) ?? [],
                        topics: payload.topics?.map((topic) => topic.name) ?? [],
                        studyPace: payload.studyPace ?? null,
                        studyMode: payload.studyMode ?? null,
                        groupSize: parseGroupSize(payload.groupSize),
                        studyStyle: parseStudyStyle(payload.studyStyles)
                    });
                    console.log(`[matching-service] handled ${topic} for user ${payload.userId}`);
                    return;
                }
                if (topic === topics_js_1.TOPICS.AVAILABILITY_UPDATED) {
                    const event = parsed;
                    const payload = event.payload;
                    // New snapshot-style payload: { userId, slots: [...] }
                    if (Array.isArray(payload.slots)) {
                        await matching_service_js_1.matchingService.replaceAvailability({
                            userId: payload.userId,
                            availability: payload.slots.map((slot) => ({
                                dayOfWeek: mapDayOfWeek(slot.dayOfWeek),
                                startTime: slot.startTime,
                                endTime: slot.endTime
                            }))
                        });
                        console.log(`[matching-service] handled ${topic} snapshot for user ${payload.userId} (${payload.slots.length} slots)`);
                        return;
                    }
                    // Legacy per-action payload fallback (kept for backward-compat only)
                    if (payload.action === "DELETED") {
                        await matching_service_js_1.matchingService.replaceAvailability({
                            userId: payload.userId,
                            availability: []
                        });
                    }
                    else if (payload.slot) {
                        await matching_service_js_1.matchingService.replaceAvailability({
                            userId: payload.userId,
                            availability: [
                                {
                                    dayOfWeek: mapDayOfWeek(payload.slot.dayOfWeek),
                                    startTime: payload.slot.startTime,
                                    endTime: payload.slot.endTime
                                }
                            ]
                        });
                    }
                    console.log(`[matching-service] handled ${topic} for user ${payload.userId}`);
                    return;
                }
                console.warn(`[matching-service] unhandled topic ${topic}`);
            }
            catch (error) {
                console.error("[matching-service] consumer error:", error);
            }
        }
    });
}
