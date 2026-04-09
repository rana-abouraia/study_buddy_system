import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './schema/type-defs.js';
import { resolvers } from './schema/resolvers.js';

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4001 },
  context: async ({ req }) => {
    // Get token from headers
    const token = req.headers.authorization || '';
    
    // Simple auth context (verify JWT here if needed)
    return { token };
  }
});

console.log(`🚀 User service ready at: ${url}`);