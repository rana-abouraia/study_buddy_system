import { prisma } from '../index';
import { Context } from '../index';
import { publishEvent } from '../kafka/producer';

export const resolvers = {
  Query: {
    getMyAvailability: async (_: any, __: any, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');
      return await prisma.availabilitySlot.findMany({
        where: { userId }
      });
    },

    getUserAvailability: async (_: any, { userId }: { userId: string }) => {
      return await prisma.availabilitySlot.findMany({
        where: { userId }
      });
    }
  },

  Mutation: {
    addAvailabilitySlot: async (_: any, args: any, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');

      const existingSlots = await prisma.availabilitySlot.findMany({
        where: { userId, dayOfWeek: args.dayOfWeek }
      });

      const newStart = args.startTime;
      const newEnd = args.endTime;

      const hasOverlap = existingSlots.some((slot) => {
        return newStart < slot.endTime && newEnd > slot.startTime;
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

      await publishEvent('availability-updated', {
        userId,
        action: 'ADDED',
        slot
      });

      return slot;
    },

    updateAvailabilitySlot: async (_: any, args: any, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');

      const slot = await prisma.availabilitySlot.findUnique({
        where: { id: args.id }
      });

      if (!slot || slot.userId !== userId) throw new Error('Not authorized');

      const newStart = args.startTime || slot.startTime;
      const newEnd = args.endTime || slot.endTime;

      const existingSlots = await prisma.availabilitySlot.findMany({
        where: {
          userId,
          dayOfWeek: slot.dayOfWeek,
          NOT: { id: args.id }
        }
      });

      const hasOverlap = existingSlots.some((s) => {
        return newStart < s.endTime && newEnd > s.startTime;
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

      await publishEvent('availability-updated', {
        userId,
        action: 'UPDATED',
        slot: updated
      });

      return updated;
    },

    deleteAvailabilitySlot: async (_: any, { id }: { id: string }, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');

      const slot = await prisma.availabilitySlot.findUnique({
        where: { id }
      });

      if (!slot || slot.userId !== userId) throw new Error('Not authorized');

      await prisma.availabilitySlot.delete({ where: { id } });

      await publishEvent('availability-updated', {
        userId,
        action: 'DELETED',
        slotId: id
      });

      return true;
    }
  }
};