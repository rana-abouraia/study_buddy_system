"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buddyService = exports.BuddyService = void 0;
const prisma_js_1 = require("../db/prisma.js");
const producer_js_1 = require("../kafka/producer.js");
class BuddyService {
    async sendRequest(senderId, receiverId) {
        if (senderId === receiverId) {
            throw new Error("Cannot send a buddy request to yourself");
        }
        const existing = await prisma_js_1.prisma.buddyRequest.findFirst({
            where: {
                status: { in: ["PENDING", "ACCEPTED"] },
                OR: [
                    { senderId, receiverId },
                    { senderId: receiverId, receiverId: senderId }
                ]
            }
        });
        if (existing) {
            throw new Error(`A buddy request already exists between these users (status: ${existing.status})`);
        }
        const created = await prisma_js_1.prisma.buddyRequest.create({
            data: {
                senderId,
                receiverId,
                status: "PENDING"
            }
        });
        try {
            await (0, producer_js_1.publishBuddyRequestReceived)({
                requestId: created.id,
                senderId: created.senderId,
                receiverId: created.receiverId
            });
        }
        catch (error) {
            console.error("[matching-service] failed to publish buddy-request-received:", error);
        }
        return created;
    }
    async accept(userId, requestId) {
        const request = await prisma_js_1.prisma.buddyRequest.findUnique({
            where: { id: requestId }
        });
        if (!request) {
            throw new Error(`Buddy request ${requestId} not found`);
        }
        if (request.receiverId !== userId) {
            throw new Error("Not authorized to accept this buddy request");
        }
        if (request.status !== "PENDING") {
            throw new Error(`Buddy request is not pending (current status: ${request.status})`);
        }
        const updated = await prisma_js_1.prisma.buddyRequest.update({
            where: { id: requestId },
            data: { status: "ACCEPTED" }
        });
        try {
            await (0, producer_js_1.publishBuddyRequestAccepted)({
                requestId: updated.id,
                senderId: updated.senderId,
                receiverId: updated.receiverId,
                accepterId: userId,
                recipientId: updated.senderId
            });
        }
        catch (error) {
            console.error("[matching-service] failed to publish buddy-request-accepted:", error);
        }
        return updated;
    }
    async reject(userId, requestId) {
        const request = await prisma_js_1.prisma.buddyRequest.findUnique({
            where: { id: requestId }
        });
        if (!request) {
            throw new Error(`Buddy request ${requestId} not found`);
        }
        if (request.receiverId !== userId) {
            throw new Error("Not authorized to reject this buddy request");
        }
        if (request.status !== "PENDING") {
            throw new Error(`Buddy request is not pending (current status: ${request.status})`);
        }
        return prisma_js_1.prisma.buddyRequest.update({
            where: { id: requestId },
            data: { status: "REJECTED" }
        });
    }
    async getIncoming(userId) {
        return prisma_js_1.prisma.buddyRequest.findMany({
            where: { receiverId: userId, status: "PENDING" },
            orderBy: { createdAt: "desc" }
        });
    }
    async getOutgoing(userId) {
        return prisma_js_1.prisma.buddyRequest.findMany({
            where: { senderId: userId, status: "PENDING" },
            orderBy: { createdAt: "desc" }
        });
    }
    async getMyBuddies(userId) {
        const accepted = await prisma_js_1.prisma.buddyRequest.findMany({
            where: {
                status: "ACCEPTED",
                OR: [{ senderId: userId }, { receiverId: userId }]
            },
            select: {
                senderId: true,
                receiverId: true
            }
        });
        const buddyIds = new Set();
        for (const row of accepted) {
            if (row.senderId === userId) {
                buddyIds.add(row.receiverId);
            }
            else if (row.receiverId === userId) {
                buddyIds.add(row.senderId);
            }
        }
        return Array.from(buddyIds);
    }
}
exports.BuddyService = BuddyService;
exports.buddyService = new BuddyService();
