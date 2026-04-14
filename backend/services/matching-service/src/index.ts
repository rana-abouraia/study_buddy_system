import "dotenv/config";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { typeDefs } from "./schema/type-defs.js";
import { resolvers } from "./schema/resolvers.js";
import { prisma } from "./db/prisma.js";
import { connectProducer } from "./kafka/producer.js";
import { startConsumer } from "./kafka/consumer.js";

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log("[matching-service] database connected");

    await connectProducer();
    await startConsumer();

    const server = new ApolloServer({
      typeDefs,
      resolvers
    });

    const port = Number(process.env.PORT || 4004);

    const { url } = await startStandaloneServer(server, {
      listen: { port }
    });

    console.log(`[matching-service] GraphQL running at ${url}`);
  } catch (error) {
    console.error("[matching-service] failed to start:", error);
    process.exit(1);
  }
}

bootstrap();