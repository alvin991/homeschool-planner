// src/utils/apolloClient.ts
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const client = new ApolloClient({
  link: new HttpLink({ uri: '/api/graphql' }), // your GraphQL endpoint
  cache: new InMemoryCache(),
});

export default client;