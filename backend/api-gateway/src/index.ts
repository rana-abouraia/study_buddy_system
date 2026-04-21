import dotenv from 'dotenv';
dotenv.config();

import { ApolloServer } from '@apollo/server';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { startStandaloneServer } from '@apollo/server/standalone';

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'user', url: process.env.USER_SERVICE_URL! },
      { name: 'profile', url: process.env.PROFILE_SERVICE_URL! },
      { name: 'availability', url: process.env.AVAILABILITY_SERVICE_URL! },
      { name: 'matching', url: process.env.MATCHING_SERVICE_URL! },
      { name: 'session', url: process.env.SESSION_SERVICE_URL! },
      { name: 'notification', url: process.env.NOTIFICATION_SERVICE_URL! },
      { name: 'messaging', url: process.env.MESSAGING_SERVICE_URL! }
    ],
    pollIntervalInMs: 5000
  })
});

const server = new ApolloServer({
  gateway
});

async function startServer() {
  const { url } = await startStandaloneServer(server, {
    listen: { port: Number(process.env.PORT) || 4000 },
    context: async ({ req }) => {
      return {
        headers: {
          authorization: req.headers.authorization || ''
        }
      };
    }
  });

  console.log(`🚀 API Gateway running at ${url}`);
}

startServer().catch(console.error);