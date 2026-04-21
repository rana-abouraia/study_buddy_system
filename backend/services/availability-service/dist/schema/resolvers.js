"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const index_1 = require("../index");
const producer_1 = require("../kafka/producer");
const isValidTime = (time) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
exports.resolvers = {
    Query: {
        getMyAvailability: async (_, __, { userId }) => {
            if (!userId)
                throw new Error('Not authenticated');
            return await index_1.prisma.availabilitySlot.findMany({
                where: { userId },
                orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
            });
        },
        getUserAvailability: async (_, { userId }) => {
            return await index_1.prisma.availabilitySlot.findMany({
                where: { userId },
                orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
            });
        }
    },
    Mutation: {
        addAvailabilitySlot: async (_, args, { userId }) => {
            if (!userId)
                throw new Error('Not authenticated');
            if (args.dayOfWeek < 0 || args.dayOfWeek > 6)
                throw new Error('Day of week must be between 0 (Sunday) and 6 (Saturday)');
            if (!isValidTime(args.startTime))
                throw new Error('Invalid start time format. Use HH:MM');
            if (!isValidTime(args.endTime))
                throw new Error('Invalid end time format. Use HH:MM');
            if (args.startTime >= args.endTime)
                throw new Error('Start time must be before end time');
            const existingSlots = await index_1.prisma.availabilitySlot.findMany({
                where: { userId, dayOfWeek: args.dayOfWeek }
            });
            const hasOverlap = existingSlots.some((slot) => {
                return args.startTime < slot.endTime && args.endTime > slot.startTime;
            });
            if (hasOverlap)
                throw new Error('Overlapping availability slot exists');
            const slot = await index_1.prisma.availabilitySlot.create({
                data: {
                    userId,
                    dayOfWeek: args.dayOfWeek,
                    startTime: args.startTime,
                    endTime: args.endTime,
                    isRecurring: args.isRecurring ?? true
                }
            });
            await (0, producer_1.publishEvent)('availability-updated', {
                userId,
                action: 'ADDED',
                slot
            });
            return slot;
        },
        updateAvailabilitySlot: async (_, args, { userId }) => {
            if (!userId)
                throw new Error('Not authenticated');
            const slot = await index_1.prisma.availabilitySlot.findUnique({
                where: { id: args.id }
            });
            if (!slot)
                throw new Error('Slot not found');
            if (slot.userId !== userId)
                throw new Error('Not authorized');
            const newStart = args.startTime || slot.startTime;
            const newEnd = args.endTime || slot.endTime;
            if (!isValidTime(newStart))
                throw new Error('Invalid start time format. Use HH:MM');
            if (!isValidTime(newEnd))
                throw new Error('Invalid end time format. Use HH:MM');
            if (newStart >= newEnd)
                throw new Error('Start time must be before end time');
            const existingSlots = await index_1.prisma.availabilitySlot.findMany({
                where: { userId, dayOfWeek: slot.dayOfWeek, NOT: { id: args.id } }
            });
            const hasOverlap = existingSlots.some((s) => {
                return newStart < s.endTime && newEnd > s.startTime;
            });
            if (hasOverlap)
                throw new Error('Overlapping availability slot exists');
            const updated = await index_1.prisma.availabilitySlot.update({
                where: { id: args.id },
                data: {
                    ...(args.startTime && { startTime: args.startTime }),
                    ...(args.endTime && { endTime: args.endTime }),
                    ...(args.isRecurring !== undefined && { isRecurring: args.isRecurring })
                }
            });
            await (0, producer_1.publishEvent)('availability-updated', {
                userId,
                action: 'UPDATED',
                slot: updated
            });
            return updated;
        },
        deleteAvailabilitySlot: async (_, { id }, { userId }) => {
            if (!userId)
                throw new Error('Not authenticated');
            const slot = await index_1.prisma.availabilitySlot.findUnique({
                where: { id }
            });
            if (!slot)
                throw new Error('Slot not found');
            if (slot.userId !== userId)
                throw new Error('Not authorized');
            await index_1.prisma.availabilitySlot.delete({ where: { id } });
            await (0, producer_1.publishEvent)('availability-updated', {
                userId,
                action: 'DELETED',
                slotId: id
            });
            return true;
        }
    }
};
