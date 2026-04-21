import dotenv from 'dotenv';
dotenv.config();

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
        console.log(`✅ ${name} is ready at ${url}`);
        return;
      }

      console.log(`⏳ ${name} responded with ${response.status}. Retry ${attempt}/${retries}`);
    } catch {
      console.log(`⏳ waiting for ${name} at ${url}... (${attempt}/${retries})`);
    }

    await sleep(delayMs);
  }

  throw new Error(`Timed out waiting for ${name} at ${url}`);
}

async function startServer() {
  const subgraphConfigs = [
    { name: 'user',         url: process.env.USER_SERVICE_URL! },
    { name: 'profile',      url: process.env.PROFILE_SERVICE_URL! },
    { name: 'availability', url: process.env.AVAILABILITY_SERVICE_URL! },
    { name: 'matching',     url: process.env.MATCHING_SERVICE_URL! },
    { name: 'session',      url: process.env.SESSION_SERVICE_URL! },
    { name: 'notification', url: process.env.NOTIFICATION_SERVICE_URL! },
    { name: 'messaging',    url: process.env.MESSAGING_SERVICE_URL! }
  ];

  // Wait for all services to be up
  for (const s of subgraphConfigs) {
    await waitForSubgraph(s.name, s.url);
  }

  // Build subschemas — separate executors for introspection vs runtime
  const subschemas = await Promise.all(
    subgraphConfigs.map(async ({ url }) => {
      // Used only at startup to fetch the schema (no auth needed)
      const introspectionExecutor = buildHTTPExecutor({ endpoint: url });

      // Used for every actual request — forwards Authorization header from client
      const executor = buildHTTPExecutor({
        endpoint: url,
        headers: (executorRequest) => ({
          'content-type': 'application/json',
          'authorization': executorRequest?.context?.headers?.authorization || ''
        })
      });

      const schema = await schemaFromExecutor(introspectionExecutor);
      return { schema, executor };
    })
  );

  // Stitch all service schemas into one unified schema
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

  console.log(`🚀 API Gateway running at ${url}`);
}

startServer().catch((error) => {
  console.error('Failed to start API Gateway:', error);
  process.exit(1);
});