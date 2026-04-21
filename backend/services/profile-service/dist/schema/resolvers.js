"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const index_1 = require("../index");
const producer_1 = require("../kafka/producer");
const profileInclude = {
    courses: true,
    topics: true,
};
const uniqueTrimmed = (values) => Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
const normalizeCourse = (course) => ({
    name: course.name.trim(),
    code: course.code.trim().toUpperCase(),
    term: course.term?.trim() || null,
});
const normalizeTopic = (topic) => ({
    name: topic.name.trim(),
});
const parseGroupSize = (value) => {
    if (!value) {
        return null;
    }
    const matches = value.match(/\d+/g);
    if (!matches?.length) {
        return null;
    }
    const numbers = matches.map(Number);
    return Math.round(numbers.reduce((sum, current) => sum + current, 0) / numbers.length);
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
const publishProfileUpdated = async (userId) => {
    const profile = await getProfileOrThrow(userId);
    await (0, producer_1.publishEvent)('profile.preferences.updated', {
        userId: profile.userId,
        studyPace: profile.studyPace,
        studyMode: profile.studyMode,
        groupSize: parseGroupSize(profile.groupSize),
        studyStyle: profile.studyStyles[0] ?? null,
        courses: profile.courses.map((course) => course.code),
        topics: profile.topics.map((topic) => topic.name),
    });
    return profile;
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
            await index_1.prisma.userProfile.upsert({
                where: { userId },
                update: {
                    studyPace: input.studyPace.trim(),
                    studyMode: input.studyMode.trim(),
                    groupSize: input.groupSize.trim(),
                    studyStyles: uniqueTrimmed(input.studyStyles),
                    preferredTimes: uniqueTrimmed(input.preferredTimes),
                    sessionLength: input.sessionLength?.trim() || null,
                },
                create: {
                    userId,
                    studyPace: input.studyPace.trim(),
                    studyMode: input.studyMode.trim(),
                    groupSize: input.groupSize.trim(),
                    studyStyles: uniqueTrimmed(input.studyStyles),
                    preferredTimes: uniqueTrimmed(input.preferredTimes),
                    sessionLength: input.sessionLength?.trim() || null,
                },
            });
            return publishProfileUpdated(userId);
        },
        replaceCourses: async (_, { courses }, context) => {
            const userId = requireUserId(context);
            const profile = await getProfileOrThrow(userId);
            const normalizedCourses = courses
                .map(normalizeCourse)
                .filter((course) => course.name.length > 0 && course.code.length > 0);
            await index_1.prisma.userProfile.update({
                where: { userId },
                data: {
                    courses: {
                        deleteMany: {},
                        create: normalizedCourses,
                    },
                },
                include: profileInclude,
            });
            return publishProfileUpdated(profile.userId);
        },
        addCourse: async (_, { input }, context) => {
            const userId = requireUserId(context);
            const profile = await getProfileOrThrow(userId);
            const course = normalizeCourse(input);
            if (!course.name || !course.code) {
                throw new Error('Course name and code are required');
            }
            const existingCourse = await index_1.prisma.course.findFirst({
                where: {
                    profileId: profile.id,
                    code: course.code,
                },
            });
            if (existingCourse) {
                await index_1.prisma.course.update({
                    where: { id: existingCourse.id },
                    data: {
                        name: course.name,
                        term: course.term,
                    },
                });
            }
            else {
                await index_1.prisma.course.create({
                    data: {
                        profileId: profile.id,
                        name: course.name,
                        code: course.code,
                        term: course.term,
                    },
                });
            }
            return publishProfileUpdated(userId);
        },
        removeCourse: async (_, { courseId }, context) => {
            const userId = requireUserId(context);
            const profile = await getProfileOrThrow(userId);
            const course = await index_1.prisma.course.findFirst({
                where: {
                    id: courseId,
                    profileId: profile.id,
                },
            });
            if (!course) {
                throw new Error('Course not found');
            }
            await index_1.prisma.course.delete({
                where: { id: courseId },
            });
            return publishProfileUpdated(userId);
        },
        replaceTopics: async (_, { topics }, context) => {
            const userId = requireUserId(context);
            await getProfileOrThrow(userId);
            const normalizedTopics = topics
                .map(normalizeTopic)
                .filter((topic) => topic.name.length > 0);
            await index_1.prisma.userProfile.update({
                where: { userId },
                data: {
                    topics: {
                        deleteMany: {},
                        create: normalizedTopics,
                    },
                },
                include: profileInclude,
            });
            return publishProfileUpdated(userId);
        },
        addTopic: async (_, { input }, context) => {
            const userId = requireUserId(context);
            const profile = await getProfileOrThrow(userId);
            const topic = normalizeTopic(input);
            if (!topic.name) {
                throw new Error('Topic name is required');
            }
            const existingTopic = await index_1.prisma.topic.findFirst({
                where: {
                    profileId: profile.id,
                    name: topic.name,
                },
            });
            if (!existingTopic) {
                await index_1.prisma.topic.create({
                    data: {
                        profileId: profile.id,
                        name: topic.name,
                    },
                });
            }
            return publishProfileUpdated(userId);
        },
        removeTopic: async (_, { topicId }, context) => {
            const userId = requireUserId(context);
            const profile = await getProfileOrThrow(userId);
            const topic = await index_1.prisma.topic.findFirst({
                where: {
                    id: topicId,
                    profileId: profile.id,
                },
            });
            if (!topic) {
                throw new Error('Topic not found');
            }
            await index_1.prisma.topic.delete({
                where: { id: topicId },
            });
            return publishProfileUpdated(userId);
        },
    },
};
