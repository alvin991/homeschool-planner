import { courseResolvers } from '@/app/api/graphql/resolvers/courseResolvers';
import { resourceResolvers } from '@/app/api/graphql/resolvers/resourceResolvers';
import { mergeGraphQLResolvers } from './mergeResolvers';
import { typeDefs } from './typedefs';

export { typeDefs };

export const resolvers = mergeGraphQLResolvers(courseResolvers, resourceResolvers);
