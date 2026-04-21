import { prisma } from '../index';
import { Context } from '../index';
import { publishEvent } from '../kafka/producer';

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const isValidTime = (time: string) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);

const publishAvailabilityUpdated = async (userId: string) => {
  const slots = await prisma.availabilitySlot.findMany({
    where: { userId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  await publishEvent('availability.updated', {
    userId,
    availability: slots.map((slot) => ({
      dayOfWeek: DAY_NAMES[slot.dayOfWeek] ?? String(slot.dayOfWeek),
      startTime: slot.startTime,
      endTime: slot.endTime,
    })),
  });
};

export const resolvers = {
  Query: {
    getMyAvailability: async (_: any, __: any, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');
      return await prisma.availabilitySlot.findMany({
        where: { userId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    },

    getUserAvailability: async (_: any, { userId }: { userId: string }) => {
      return await prisma.availabilitySlot.findMany({
        where: { userId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    }
  },

  Mutation: {
    addAvailabilitySlot: async (_: any, args: any, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');
      if (args.dayOfWeek < 0 || args.dayOfWeek > 6) {
        throw new Error('Day of week must be between 0 (Sunday) and 6 (Saturday)');
      }
      if (!isValidTime(args.startTime)) throw new Error('Invalid start time format. Use HH:MM');
      if (!isValidTime(args.endTime)) throw new Error('Invalid end time format. Use HH:MM');
      if (args.startTime >= args.endTime) throw new Error('Start time must be before end time');

      const existingSlots = await prisma.availabilitySlot.findMany({
        where: { userId, dayOfWeek: args.dayOfWeek }
      });

      const hasOverlap = existingSlots.some((slot) => {
        return args.startTime < slot.endTime && args.endTime > slot.startTime;
      });

      if (hasOverlap) throw new Error('Overlapping availability slot exists');

      const slot = await prisma.availabilitySlot.create({
        data: {
          userId,
          dayOfWeek: args.dayOfWeek,
          startTime: args.startTime,
          endTime: args.endTime,
          isRecurring: args.isRecurring ?? true
        }
      });

      await publishAvailabilityUpdated(userId);

      return slot;
    },

    updateAvailabilitySlot: async (_: any, args: any, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');

      const slot = await prisma.availabilitySlot.findUnique({
        where: { id: args.id }
      });

      if (!slot) throw new Error('Slot not found');
      if (slot.userId !== userId) throw new Error('Not authorized');

      const newStart = args.startTime || slot.startTime;
      const newEnd = args.endTime || slot.endTime;

      if (!isValidTime(newStart)) throw new Error('Invalid start time format. Use HH:MM');
      if (!isValidTime(newEnd)) throw new Error('Invalid end time format. Use HH:MM');
      if (newStart >= newEnd) throw new Error('Start time must be before end time');

      const existingSlots = await prisma.availabilitySlot.findMany({
        where: { userId, dayOfWeek: slot.dayOfWeek, NOT: { id: args.id } }
      });

      const hasOverlap = existingSlots.some((candidate) => {
        return newStart < candidate.endTime && newEnd > candidate.startTime;
      });

      if (hasOverlap) throw new Error('Overlapping availability slot exists');

      const updated = await prisma.availabilitySlot.update({
        where: { id: args.id },
        data: {
          ...(args.startTime && { startTime: args.startTime }),
          ...(args.endTime && { endTime: args.endTime }),
          ...(args.isRecurring !== undefined && { isRecurring: args.isRecurring })
        }
      });

      await publishAvailabilityUpdated(userId);

      return updated;
    },

    deleteAvailabilitySlot: async (_: any, { id }: { id: string }, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');

      const slot = await prisma.availabilitySlot.findUnique({
        where: { id }
      });

      if (!slot) throw new Error('Slot not found');
      if (slot.userId !== userId) throw new Error('Not authorized');

      await prisma.availabilitySlot.delete({ where: { id } });
      await publishAvailabilityUpdated(userId);

      return true;
    }
  }
};
