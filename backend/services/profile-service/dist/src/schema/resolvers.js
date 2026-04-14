"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const client_1 = require("@prisma/client");
const index_1 = require("../index");
const producer_1 = require("../kafka/producer");
const profileInclude = {
    courses: true,
    topics: true,
};
const PREFERENCE_UPDATE_BUDGET_MS = Number(process.env.PREFERENCE_UPDATE_BUDGET_MS) || 2000;
const uniqueTrimmed = (values) => Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
const normalizeCourse = (course) => ({
    name: course.name.trim(),
    code: course.code.trim().toUpperCase(),
    term: course.term?.trim() || null,
});
const normalizeTopic = (topic) => ({
    name: topic.name.trim(),
});
const normalizePreferences = (input) => ({
    studyPace: input.studyPace.trim(),
    studyMode: input.studyMode.trim(),
    groupSize: input.groupSize.trim(),
    studyStyles: uniqueTrimmed(input.studyStyles),
    preferredTimes: uniqueTrimmed(input.preferredTimes),
    sessionLength: input.sessionLength?.trim() || null,
});
const dedupeCourses = (courses) => {
    const uniqueCourses = new Map();
    for (const course of courses.map(normalizeCourse)) {
        if (!course.name || !course.code) {
            continue;
        }
        uniqueCourses.set(course.code, course);
    }
    return Array.from(uniqueCourses.values());
};
const dedupeTopics = (topics) => {
    const uniqueTopics = new Map();
    for (const topic of topics.map(normalizeTopic)) {
        if (!topic.name) {
            continue;
        }
        uniqueTopics.set(topic.name.toLowerCase(), topic);
    }
    return Array.from(uniqueTopics.values());
};
const requireUserId = (context) => {
    if (!context.userId) {
        throw new Error('Not authenticated');
    }
    return context.userId;
};
const getProfileOrThrow = async (userId) => {
    const profile = await index_1.prisma.userProfile.findUnique({
        where: { userId },
        include: profileInclude,
    });
    if (!profile) {
        throw new Error('Profile not found');
    }
    return profile;
};
const getProfileIdOrThrow = async (userId, client = index_1.prisma) => {
    const profile = await client.userProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!profile) {
        throw new Error('Profile not found');
    }
    return profile.id;
};
const buildProfileUpdatedPayload = (profile) => ({
    userId: profile.userId,
    studyPace: profile.studyPace,
    studyMode: profile.studyMode,
    groupSize: profile.groupSize,
    studyStyles: profile.studyStyles,
    preferredTimes: profile.preferredTimes,
    sessionLength: profile.sessionLength,
    courses: profile.courses.map((course) => ({
        id: course.id,
        name: course.name,
        code: course.code,
        term: course.term,
    })),
    topics: profile.topics.map((topic) => ({
        id: topic.id,
        name: topic.name,
    })),
});
const emitProfileUpdated = (profile) => {
    (0, producer_1.publishEventInBackground)('user-preferences-updated', buildProfileUpdatedPayload(profile));
    return profile;
};
const logWriteDuration = (operationName, startedAt, userId) => {
    const durationMs = Date.now() - startedAt;
    const message = `${operationName} completed in ${durationMs}ms for user ${userId}`;
    if (durationMs > PREFERENCE_UPDATE_BUDGET_MS) {
        console.warn(`${message}, which exceeded the ${PREFERENCE_UPDATE_BUDGET_MS}ms target.`);
        return;
    }
    console.log(message);
};
const runMeasuredWrite = async (operationName, userId, operation) => {
    const startedAt = Date.now();
    const result = await operation();
    logWriteDuration(operationName, startedAt, userId);
    return result;
};
const mapProfileNotFound = (error) => {
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025') {
        throw new Error('Profile not found');
    }
    throw error;
};
exports.resolvers = {
    Query: {
        getProfile: async (_, { userId }) => {
            return index_1.prisma.userProfile.findUnique({
                where: { userId },
                include: profileInclude,
            });
        },
        getPreferences: async (_, { userId }) => {
            return index_1.prisma.userProfile.findUnique({
                where: { userId },
                include: profileInclude,
            });
        },
        getCoursesAndTopics: async (_, { userId }) => {
            return index_1.prisma.userProfile.findUnique({
                where: { userId },
                include: profileInclude,
            });
        },
        meProfile: async (_, __, context) => {
            const userId = requireUserId(context);
            return index_1.prisma.userProfile.findUnique({
                where: { userId },
                include: profileInclude,
            });
        },
    },
    Mutation: {
        updatePreferences: async (_, { input }, context) => {
            const userId = requireUserId(context);
            const preferences = normalizePreferences(input);
            return runMeasuredWrite('updatePreferences', userId, async () => {
                const profile = await index_1.prisma.userProfile.upsert({
                    where: { userId },
                    update: preferences,
                    create: {
                        userId,
                        ...preferences,
                    },
                    include: profileInclude,
                });
                return emitProfileUpdated(profile);
            });
        },
        replaceCourses: async (_, { courses }, context) => {
            const userId = requireUserId(context);
            const normalizedCourses = dedupeCourses(courses);
            return runMeasuredWrite('replaceCourses', userId, async () => {
                try {
                    const profile = await index_1.prisma.userProfile.update({
                        where: { userId },
                        data: {
                            courses: {
                                deleteMany: {},
                                create: normalizedCourses,
                            },
                        },
                        include: profileInclude,
                    });
                    return emitProfileUpdated(profile);
                }
                catch (error) {
                    mapProfileNotFound(error);
                }
            });
        },
        addCourse: async (_, { input }, context) => {
            const userId = requireUserId(context);
            const course = normalizeCourse(input);
            if (!course.name || !course.code) {
                throw new Error('Course name and code are required');
            }
            return runMeasuredWrite('addCourse', userId, async () => {
                const profile = await index_1.prisma.$transaction(async (tx) => {
                    const profileId = await getProfileIdOrThrow(userId, tx);
                    await tx.course.upsert({
                        where: {
                            profileId_code: {
                                profileId,
                                code: course.code,
                            },
                        },
                        update: {
                            name: course.name,
                            term: course.term,
                        },
                        create: {
                            profileId,
                            name: course.name,
                            code: course.code,
                            term: course.term,
                        },
                    });
                    return tx.userProfile.findUniqueOrThrow({
                        where: { userId },
                        include: profileInclude,
                    });
                });
                return emitProfileUpdated(profile);
            });
        },
        removeCourse: async (_, { courseId }, context) => {
            const userId = requireUserId(context);
            return runMeasuredWrite('removeCourse', userId, async () => {
                const profile = await index_1.prisma.$transaction(async (tx) => {
                    const profileId = await getProfileIdOrThrow(userId, tx);
                    const deletedCourses = await tx.course.deleteMany({
                        where: {
                            id: courseId,
                            profileId,
                        },
                    });
                    if (deletedCourses.count === 0) {
                        throw new Error('Course not found');
                    }
                    return tx.userProfile.findUniqueOrThrow({
                        where: { userId },
                        include: profileInclude,
                    });
                });
                return emitProfileUpdated(profile);
            });
        },
        replaceTopics: async (_, { topics }, context) => {
            const userId = requireUserId(context);
            const normalizedTopics = dedupeTopics(topics);
            return runMeasuredWrite('replaceTopics', userId, async () => {
                try {
                    const profile = await index_1.prisma.userProfile.update({
                        where: { userId },
                        data: {
                            topics: {
                                deleteMany: {},
                                create: normalizedTopics,
                            },
                        },
                        include: profileInclude,
                    });
                    return emitProfileUpdated(profile);
                }
                catch (error) {
                    mapProfileNotFound(error);
                }
            });
        },
        addTopic: async (_, { input }, context) => {
            const userId = requireUserId(context);
            const topic = normalizeTopic(input);
            if (!topic.name) {
                throw new Error('Topic name is required');
            }
            return runMeasuredWrite('addTopic', userId, async () => {
                const profile = await index_1.prisma.$transaction(async (tx) => {
                    const profileId = await getProfileIdOrThrow(userId, tx);
                    await tx.topic.upsert({
                        where: {
                            profileId_name: {
                                profileId,
                                name: topic.name,
                            },
                        },
                        update: {},
                        create: {
                            profileId,
                            name: topic.name,
                        },
                    });
                    return tx.userProfile.findUniqueOrThrow({
                        where: { userId },
                        include: profileInclude,
                    });
                });
                return emitProfileUpdated(profile);
            });
        },
        removeTopic: async (_, { topicId }, context) => {
            const userId = requireUserId(context);
            return runMeasuredWrite('removeTopic', userId, async () => {
                const profile = await index_1.prisma.$transaction(async (tx) => {
                    const profileId = await getProfileIdOrThrow(userId, tx);
                    const deletedTopics = await tx.topic.deleteMany({
                        where: {
                            id: topicId,
                            profileId,
                        },
                    });
                    if (deletedTopics.count === 0) {
                        throw new Error('Topic not found');
                    }
                    return tx.userProfile.findUniqueOrThrow({
                        where: { userId },
                        include: profileInclude,
                    });
                });
                return emitProfileUpdated(profile);
            });
        },
    },
};
