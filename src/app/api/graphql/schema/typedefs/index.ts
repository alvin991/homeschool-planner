import { courseTypeDefs } from './course.typedefs';
import { sharedInputsTypeDefs } from './inputs.typedefs';
import { lessonTreeTypeDefs } from './lessonTree.typedefs';
import { mutationResourceTypeDefs } from './mutation.resource.typedefs';
import { mutationCourseTypeDefs } from './mutation.course.typedefs';
import { queryResourceTypeDefs } from './query.resource.typedefs';
import { queryCourseTypeDefs } from './query.course.typedefs';
import { subjectPublisherTypeDefs } from './subjectPublisher.typedefs';

/** Order matters: types before roots; `extend` after base `type Query` / `type Mutation`. */
export const typeDefs = [
  lessonTreeTypeDefs,
  courseTypeDefs,
  subjectPublisherTypeDefs,
  sharedInputsTypeDefs,
  queryCourseTypeDefs,
  queryResourceTypeDefs,
  mutationCourseTypeDefs,
  mutationResourceTypeDefs,
].join('\n');
