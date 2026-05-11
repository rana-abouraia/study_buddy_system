import { prisma } from "../db/prisma.js";
import {
  publishBuddyRequestAccepted,
  publishBuddyRequestReceived
} from "../kafka/producer.js";

export class BuddyService {
  async sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new Error("Cannot send a buddy request to yourself");
    }

    const existing = await prisma.buddyRequest.findFirst({
      where: {
        status: { in: ["PENDING", "ACCEPTED"] },
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId }
        ]
      }
    });

    if (existing) {
      throw new Error(
        `A buddy request already exists between these users (status: ${existing.status})`
      );
    }

    const created = await prisma.buddyRequest.create({
      data: {
        senderId,
        receiverId,
        status: "PENDING"
      }
    });

    try {
      await publishBuddyRequestReceived({
        requestId: created.id,
        senderId: created.senderId,
        receiverId: created.receiverId
      });
    } catch (error) {
      console.error(
        "[matching-service] failed to publish buddy-request-received:",
        error
      );
    }

    return created;
  }

  async accept(userId: string, requestId: string) {
    const request = await prisma.buddyRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new Error(`Buddy request ${requestId} not found`);
    }

    if (request.receiverId !== userId) {
      throw new Error("Not authorized to accept this buddy request");
    }

    if (request.status !== "PENDING") {
      throw new Error(
        `Buddy request is not pending (current status: ${request.status})`
      );
    }

    const updated = await prisma.buddyRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED" }
    });

    try {
      await publishBuddyRequestAccepted({
        requestId: updated.id,
        senderId: updated.senderId,
        receiverId: updated.receiverId,
        accepterId: userId,
        recipientId: updated.senderId
      });
    } catch (error) {
      console.error(
        "[matching-service] failed to publish buddy-request-accepted:",
        error
      );
    }

    return updated;
  }

  async reject(userId: string, requestId: string) {
    const request = await prisma.buddyRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new Error(`Buddy request ${requestId} not found`);
    }

    if (request.receiverId !== userId) {
      throw new Error("Not authorized to reject this buddy request");
    }

    if (request.status !== "PENDING") {
      throw new Error(
        `Buddy request is not pending (current status: ${request.status})`
      );
    }

    return prisma.buddyRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" }
    });
  }

  async getIncoming(userId: string) {
    return prisma.buddyRequest.findMany({
      where: { receiverId: userId, status: "PENDING" },
      orderBy: { createdAt: "desc" }
    });
  }

  async getOutgoing(userId: string) {
    return prisma.buddyRequest.findMany({
      where: { senderId: userId, status: "PENDING" },
      orderBy: { createdAt: "desc" }
    });
  }

  async getMyBuddies(userId: string): Promise<string[]> {
    const accepted = await prisma.buddyRequest.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: userId }, { receiverId: userId }]
      },
      select: {
        senderId: true,
        receiverId: true
      }
    });

    const buddyIds = new Set<string>();
    for (const row of accepted) {
      if (row.senderId === userId) {
        buddyIds.add(row.receiverId);
      } else if (row.receiverId === userId) {
        buddyIds.add(row.senderId);
      }
    }

    return Array.from(buddyIds);
  }
}

export const buddyService = new BuddyService();