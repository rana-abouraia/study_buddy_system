import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import jwt from 'jsonwebtoken';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { typeDefs } from './schema/type-defs';
import { resolvers } from './schema/resolvers';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
export const prisma = new PrismaClient({ adapter });

export interface Context {
  userId: string | null;
  prisma: PrismaClient;
}

const JWT_SECRET = process.env.JWT_SECRET || 'study-buddy-dev-secret';

async function main() {
  const server = new ApolloServer<Context>({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: Number(process.env.PORT) || 4002 },
    context: async ({ req }): Promise<Context> => {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '').trim();
      let userId: string | null = null;

      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
          userId = decoded.userId;
        } catch {
          userId = null;
        }
      }

      return { userId, prisma };
    },
  });

  console.log(`Profile service ready at: ${url}`);
}

main().catch(async (error) => {
  console.error('Failed to start profile service:', error);
  await prisma.$disconnect();
  process.exit(1);
});
