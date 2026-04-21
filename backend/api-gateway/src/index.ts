import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { stitchSchemas, ValidationLevel } from '@graphql-tools/stitch';
import { schemaFromExecutor } from '@graphql-tools/wrap';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForSubgraph(name: string, url: string, retries = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'query { __typename }' })
      });

      if (response.ok) {
        console.log(`${name} is ready at ${url}`);
        return;
      }

      console.log(`${name} responded with ${response.status}. Retry ${attempt}/${retries}`);
    } catch {
      console.log(`Waiting for ${name} at ${url}... (${attempt}/${retries})`);
    }

    await sleep(delayMs);
  }

  throw new Error(`Timed out waiting for ${name} at ${url}`);
}

async function startServer() {
  const subgraphConfigs = [
    { name: 'user', url: process.env.USER_SERVICE_URL || 'http://localhost:4001' },
    { name: 'profile', url: process.env.PROFILE_SERVICE_URL || 'http://localhost:4002' },
    { name: 'availability', url: process.env.AVAILABILITY_SERVICE_URL || 'http://localhost:4003' },
    { name: 'matching', url: process.env.MATCHING_SERVICE_URL || 'http://localhost:4004' },
    { name: 'session', url: process.env.SESSION_SERVICE_URL || 'http://localhost:4005' },
    { name: 'notification', url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4006' },
    { name: 'messaging', url: process.env.MESSAGING_SERVICE_URL || 'http://localhost:4007' }
  ];

  for (const service of subgraphConfigs) {
    await waitForSubgraph(service.name, service.url);
  }

  const subschemas = await Promise.all(
    subgraphConfigs.map(async ({ url }) => {
      const introspectionExecutor = buildHTTPExecutor({ endpoint: url });
      const executor = buildHTTPExecutor({
        endpoint: url,
        headers: (executorRequest) => ({
          'content-type': 'application/json',
          authorization: executorRequest?.context?.headers?.authorization || ''
        })
      });

      const schema = await schemaFromExecutor(introspectionExecutor);
      return { schema, executor };
    })
  );

  const schema = stitchSchemas({
    subschemas,
    typeMergingOptions: {
      validationScopes: {
        'AvailabilitySlot.dayOfWeek': {
          validationLevel: ValidationLevel.Off
        }
      }
    }
  });

  const server = new ApolloServer({ schema });

  const { url } = await startStandaloneServer(server, {
    listen: { port: Number(process.env.PORT) || 4000 },
    context: async ({ req }) => ({
      headers: {
        authorization: req.headers.authorization || ''
      }
    })
  });

  console.log(`API Gateway running at ${url}`);
}

startServer().catch((error) => {
  console.error('Failed to start API Gateway:', error);
  process.exit(1);
});
