import dotenv from 'dotenv';
dotenv.config();

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import jwt from 'jsonwebtoken';
import { resolvers } from './schema/resolvers';
import { typeDefs } from './schema/type-defs';
import { startNotificationConsumer } from './kafka/consumer';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Check backend/services/notification-service/.env');
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

export interface Context {
  prisma: PrismaClient;
  userId: string | null;
}

const JWT_SECRET = process.env.JWT_SECRET || 'study-buddy-dev-secret';

const getUserIdFromRequest = (
  req: { headers: Record<string, string | string[] | undefined> }
) => {
  const authHeader = req.headers.authorization;
  if (typeof authHeader !== 'string') return null;

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
};

async function main() {
  await prisma.$connect();
  console.log('Notification service database connected');

  const server = new ApolloServer<Context>({
    typeDefs,
    resolvers,
  });

  const port = Number(process.env.PORT) || 4006;

  const { url } = await startStandaloneServer(server, {
    listen: { port },
    context: async ({ req }): Promise<Context> => ({
      prisma,
      userId: getUserIdFromRequest(req),
    }),
  });

  console.log(`Notification service ready at ${url}`);

  await startNotificationConsumer(prisma);
}

main().catch(async (error) => {
  console.error('Notification service failed to start:', error);
  await prisma.$disconnect();
  process.exit(1);
});
