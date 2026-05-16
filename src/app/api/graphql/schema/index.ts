import { courseResolvers } from '@/app/api/graphql/resolvers/courseResolvers';
import { resourceResolvers } from '@/app/api/graphql/resolvers/resourceResolvers';
import { mergeGraphQLResolvers } from './mergeResolvers';
import { typeDefs } from './typedefs';
import { enrollmentResolvers } from '../resolvers/enrollmentResolvers';
import { studentResolvers } from '../resolvers/studentResolvers';

export { typeDefs };

export const resolvers = mergeGraphQLResolvers(courseResolvers, resourceResolvers, studentResolvers, enrollmentResolvers);
