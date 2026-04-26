import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import type { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { resolvers, typeDefs } from '@/app/api/graphql/schema';

const apolloServer = new ApolloServer({ typeDefs, resolvers });

const graphqlHandler = startServerAndCreateNextHandler<NextRequest>(apolloServer, {
  context: async () => {
    if (mongoose.connection.readyState === 0) {
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        throw new Error('Missing MONGODB_URI in environment (.env for local dev).');
      }
      await mongoose.connect(uri);
    }
    return {};
  },
});

/** App Router requires `(req, context)`; Apollo handler is `(req)` only. */
export async function POST(
  request: NextRequest,
  _context: { params: Promise<Record<string, never>> },
) {
  return graphqlHandler(request);
}
