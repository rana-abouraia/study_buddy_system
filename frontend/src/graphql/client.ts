import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

// ─── HTTP Link ───────────────────────────────────────────
// Points to your GraphQL Gateway (update URL when deployed)
const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql',
});

// ─── Auth Link ───────────────────────────────────────────
// Attaches JWT token to every request
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('hivemind_token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// ─── Error Link ──────────────────────────────────────────
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, extensions }) => {
      console.error(`[GraphQL error]: ${message}`);
      // Auto-logout on auth errors
      if (extensions?.code === 'UNAUTHENTICATED') {
        localStorage.removeItem('hivemind_token');
        window.location.href = '/login';
      }
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

// ─── Apollo Client ───────────────────────────────────────
export const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});
