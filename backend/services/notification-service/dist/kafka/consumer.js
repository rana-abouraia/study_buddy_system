"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startNotificationConsumer = void 0;
const kafkajs_1 = require("kafkajs");
const notification_mapper_1 = require("./notification-mapper");
const DEFAULT_TOPICS = [
    'match-found',
    'buddy-request-received',
    'buddy-request-accepted',
    'session-invitation-received',
    'study-session-invitation',
    'session-reminder',
    'study-session-reminder',
    'session-upcoming',
];
const getTopics = () => {
    const configuredTopics = process.env.NOTIFICATION_TOPICS
        ?.split(',')
        .map((topic) => topic.trim())
        .filter(Boolean);
    return configuredTopics?.length ? configuredTopics : DEFAULT_TOPICS;
};
let consumer = null;
let admin = null;
const startNotificationConsumer = async (prisma) => {
    if (consumer) {
        return consumer;
    }
    const kafka = new kafkajs_1.Kafka({
        clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
        brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
    });
    consumer = kafka.consumer({
        groupId: process.env.KAFKA_GROUP_ID || 'notification-service-group',
    });
    admin = kafka.admin();
    const topics = getTopics();
    await admin.connect();
    await admin.createTopics({
        waitForLeaders: true,
        topics: topics.map((topic) => ({
            topic,
            numPartitions: 1,
            replicationFactor: 1,
        })),
    });
    await admin.disconnect();
    await consumer.connect();
    for (const topic of topics) {
        await consumer.subscribe({ topic, fromBeginning: false });
    }
    await consumer.run({
        eachMessage: async ({ topic, message }) => {
            try {
                if (!message.value) {
                    return;
                }
                const parsed = JSON.parse(message.value.toString());
                const notifications = (0, notification_mapper_1.mapEventToNotifications)(topic, parsed);
                if (!notifications.length) {
                    console.warn(`No notification recipients could be derived for topic "${topic}".`);
                    return;
                }
                await prisma.notification.createMany({
                    data: notifications,
                });
                console.log(`Stored ${notifications.length} notification(s) from topic "${topic}" for ${notifications
                    .map((notification) => notification.userId)
                    .join(', ')}.`);
            }
            catch (error) {
                console.error(`Failed to process Kafka message from topic "${topic}":`, error);
            }
        },
    });
    console.log(`Notification consumer is listening to topics: ${topics.join(', ')}`);
    return consumer;
};
exports.startNotificationConsumer = startNotificationConsumer;
