import { courseTypeDefs } from './course.typedefs';
import { sharedInputsTypeDefs } from './inputs.typedefs';
import { lessonTreeTypeDefs } from './lessonTree.typedefs';
import { mutationResourceTypeDefs } from './mutation.resource.typedefs';
import { mutationCourseTypeDefs } from './mutation.course.typedefs';
import { queryResourceTypeDefs } from './query.resource.typedefs';
import { queryCourseTypeDefs } from './query.course.typedefs';
import { subjectPublisherTypeDefs } from './subjectPublisher.typedefs';
import { enrollmentTypeDefs } from './enrollment.typedefs';
import { queryEnrollmentTypeDefs } from './query.enrollment.typedefs';
import { mutationEnrollmentTypeDefs } from './mutation.enrollment.typedefs';
import { studentTypeDefs } from './student.typedefs';
import { queryStudentTypeDefs } from './query.student.typedefs';
import { mutationStudentTypeDefs } from './mutation.student.typedefs';

/** Order matters: types before roots; `extend` after base `type Query` / `type Mutation`. */
export const typeDefs = [
  lessonTreeTypeDefs,
  courseTypeDefs,
  subjectPublisherTypeDefs,
  sharedInputsTypeDefs,
  studentTypeDefs,
  enrollmentTypeDefs,
  queryCourseTypeDefs,
  queryResourceTypeDefs,
  queryStudentTypeDefs,
  queryEnrollmentTypeDefs,
  mutationCourseTypeDefs,
  mutationResourceTypeDefs,
  mutationStudentTypeDefs,
  mutationEnrollmentTypeDefs,
].join('\n');
