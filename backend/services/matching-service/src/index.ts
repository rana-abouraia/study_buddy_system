import "dotenv/config";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import jwt from "jsonwebtoken";
import { typeDefs } from "./schema/type-defs.js";
import { resolvers } from "./schema/resolvers.js";
import { prisma } from "./db/prisma.js";
import { connectProducer } from "./kafka/producer.js";
import { startConsumer } from "./kafka/consumer.js";

export interface Context {
  userId: string | null;
}

const JWT_SECRET = process.env.JWT_SECRET || "study-buddy-dev-secret";

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log("[matching-service] database connected");

    await connectProducer();
    await startConsumer();

    const server = new ApolloServer<Context>({
      typeDefs,
      resolvers
    });

    const port = Number(process.env.PORT || 4004);

    const { url } = await startStandaloneServer(server, {
      listen: { port },
      context: async ({ req }): Promise<Context> => {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.replace("Bearer ", "").trim();
        if (!token) return { userId: null };

        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
          return { userId: decoded.userId };
        } catch {
          return { userId: null };
        }
      }
    });

    console.log(`[matching-service] GraphQL running at ${url}`);
  } catch (error) {
    console.error("[matching-service] failed to start:", error);
    process.exit(1);
  }
}

bootstrap();
