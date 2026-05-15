import { Prisma } from '@prisma/client';
import { prisma } from '../index';
import type { Context } from '../index';
import { publishEvent } from '../kafka/producer';

const profileInclude = {
  courses: true,
  topics: true,
} satisfies Prisma.UserProfileInclude;

type CourseInput = {
  name: string;
  code: string;
  term?: string | null;
};

type TopicInput = {
  name: string;
};

type UpdatePreferencesInput = {
  studyPace: string;
  studyMode: string;
  groupSize: string;
  studyStyles: string[];
  preferredTimes: string[];
  sessionLength?: string | null;
};

const uniqueTrimmed = (values: string[]) =>
  Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))
  );

const normalizeCourse = (course: CourseInput): CourseInput => ({
  name: course.name.trim(),
  code: course.code.trim().toUpperCase(),
  term: course.term?.trim() || null,
});

const normalizeTopic = (topic: TopicInput): TopicInput => ({
  name: topic.name.trim(),
});

const parseGroupSize = (value?: string | null) => {
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

const requireUserId = (context: Context) => {
  if (!context.userId) {
    throw new Error('Not authenticated');
  }

  return context.userId;
};

const getProfileOrThrow = async (userId: string) => {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    include: profileInclude,
  });

  if (!profile) {
    throw new Error('Profile not found');
  }

  return profile;
};

const publishProfileUpdated = async (userId: string) => {
  const profile = await getProfileOrThrow(userId);

  await publishEvent('profile.preferences.updated', {
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

export const resolvers = {
  Query: {
    getProfile: async (_: unknown, { userId }: { userId: string }) => {
      return prisma.userProfile.findUnique({
        where: { userId },
        include: profileInclude,
      });
    },

    getPreferences: async (_: unknown, { userId }: { userId: string }) => {
      return prisma.userProfile.findUnique({
        where: { userId },
        include: profileInclude,
      });
    },

    getCoursesAndTopics: async (_: unknown, { userId }: { userId: string }) => {
      return prisma.userProfile.findUnique({
        where: { userId },
        include: profileInclude,
      });
    },

    getProfileSuggestions: async (_: unknown, { search }: { search?: string }) => {
      const query = search?.trim();
      const courseWhere = query
        ? { name: { contains: query, mode: 'insensitive' as const } }
        : undefined;
      const topicWhere = query
        ? { name: { contains: query, mode: 'insensitive' as const } }
        : undefined;

      const [courses, topics] = await Promise.all([
        prisma.course.findMany({
          where: courseWhere,
          distinct: ['code'],
          orderBy: [{ name: 'asc' }, { code: 'asc' }],
          take: 20,
        }),
        prisma.topic.findMany({
          where: topicWhere,
          distinct: ['name'],
          orderBy: { name: 'asc' },
          take: 20,
        }),
      ]);

      return { courses, topics };
    },

    meProfile: async (_: unknown, __: unknown, context: Context) => {
      const userId = requireUserId(context);
      return prisma.userProfile.findUnique({
        where: { userId },
        include: profileInclude,
      });
    },
  },

  Mutation: {
    updatePreferences: async (
      _: unknown,
      { input }: { input: UpdatePreferencesInput },
      context: Context
    ) => {
      const userId = requireUserId(context);

      await prisma.userProfile.upsert({
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

    replaceCourses: async (
      _: unknown,
      { courses }: { courses: CourseInput[] },
      context: Context
    ) => {
      const userId = requireUserId(context);
      const profile = await getProfileOrThrow(userId);
      const normalizedCourses = courses
        .map(normalizeCourse)
        .filter((course) => course.name.length > 0 && course.code.length > 0);

      await prisma.userProfile.update({
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

    addCourse: async (
      _: unknown,
      { input }: { input: CourseInput },
      context: Context
    ) => {
      const userId = requireUserId(context);
      const profile = await getProfileOrThrow(userId);
      const course = normalizeCourse(input);

      if (!course.name || !course.code) {
        throw new Error('Course name and code are required');
      }

      const existingCourse = await prisma.course.findFirst({
        where: {
          profileId: profile.id,
          code: course.code,
        },
      });

      if (existingCourse) {
        await prisma.course.update({
          where: { id: existingCourse.id },
          data: {
            name: course.name,
            term: course.term,
          },
        });
      } else {
        await prisma.course.create({
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

    removeCourse: async (
      _: unknown,
      { courseId }: { courseId: string },
      context: Context
    ) => {
      const userId = requireUserId(context);
      const profile = await getProfileOrThrow(userId);

      const course = await prisma.course.findFirst({
        where: {
          id: courseId,
          profileId: profile.id,
        },
      });

      if (!course) {
        throw new Error('Course not found');
      }

      await prisma.course.delete({
        where: { id: courseId },
      });

      return publishProfileUpdated(userId);
    },

    replaceTopics: async (
      _: unknown,
      { topics }: { topics: TopicInput[] },
      context: Context
    ) => {
      const userId = requireUserId(context);
      await getProfileOrThrow(userId);

      const normalizedTopics = topics
        .map(normalizeTopic)
        .filter((topic) => topic.name.length > 0);

      await prisma.userProfile.update({
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

    addTopic: async (
      _: unknown,
      { input }: { input: TopicInput },
      context: Context
    ) => {
      const userId = requireUserId(context);
      const profile = await getProfileOrThrow(userId);
      const topic = normalizeTopic(input);

      if (!topic.name) {
        throw new Error('Topic name is required');
      }

      const existingTopic = await prisma.topic.findFirst({
        where: {
          profileId: profile.id,
          name: topic.name,
        },
      });

      if (!existingTopic) {
        await prisma.topic.create({
          data: {
            profileId: profile.id,
            name: topic.name,
          },
        });
      }

      return publishProfileUpdated(userId);
    },

    removeTopic: async (
      _: unknown,
      { topicId }: { topicId: string },
      context: Context
    ) => {
      const userId = requireUserId(context);
      const profile = await getProfileOrThrow(userId);

      const topic = await prisma.topic.findFirst({
        where: {
          id: topicId,
          profileId: profile.id,
        },
      });

      if (!topic) {
        throw new Error('Topic not found');
      }

      await prisma.topic.delete({
        where: { id: topicId },
      });

      return publishProfileUpdated(userId);
    },
  },
};
