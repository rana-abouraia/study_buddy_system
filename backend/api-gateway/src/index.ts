import dotenv from 'dotenv';
dotenv.config();

import { ApolloServer } from '@apollo/server';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { startStandaloneServer } from '@apollo/server/standalone';

// Service URLs (from docker-compose internal network)
const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'user', url: process.env.USER_SERVICE_URL || 'http://localhost:4001/graphql' },
      { name: 'profile', url: process.env.PROFILE_SERVICE_URL || 'http://localhost:4002/graphql' },
      { name: 'availability', url: process.env.AVAILABILITY_SERVICE_URL || 'http://localhost:4003/graphql' },
      { name: 'matching', url: process.env.MATCHING_SERVICE_URL || 'http://localhost:4004/graphql' },
      { name: 'session', url: process.env.SESSION_SERVICE_URL || 'http://localhost:4005/graphql' },
      { name: 'notification', url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4006/graphql' },
      { name: 'messaging', url: process.env.MESSAGING_SERVICE_URL || 'http://localhost:4007/graphql' },
    ],
    pollIntervalInMs: 5000, // Check for schema updates every 5 seconds
  }),
});

const server = new ApolloServer({
  gateway,
  // Subscriptions not needed for now
});

async function main() {
  const { url } = await startStandaloneServer(server, {
    listen: { port: Number(process.env.PORT) || 4000 },
    context: async ({ req }) => {
      // Forward authorization header to subgraphs
      return {
        headers: {
          authorization: req.headers.authorization || '',
        },
      };
    },
  });

  console.log(`🚀 API Gateway ready at: ${url}`);
  console.log(`📊 Query at: ${url}`);
}

main().catch(console.error);