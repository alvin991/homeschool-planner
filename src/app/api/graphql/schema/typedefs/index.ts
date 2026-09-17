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
import { calendarTypeDefs } from './calendar.typedefs';
import { queryCalendarTypeDefs } from './query.calendar.typedefs';
import { calendarEventTypeDefs } from './calendarEvent.typedefs';
import { queryCalendarEventTypeDefs } from './query.calendarEvent.typedefs';
import { mutationCalendarEventTypeDefs } from './mutation.calendarEvent.typedefs';

/** Order matters: types before roots; `extend` after base `type Query` / `type Mutation`. */
export const typeDefs = [
  lessonTreeTypeDefs,
  courseTypeDefs,
  subjectPublisherTypeDefs,
  sharedInputsTypeDefs,
  studentTypeDefs,
  enrollmentTypeDefs,
  calendarTypeDefs,
  calendarEventTypeDefs,
  queryCourseTypeDefs,
  queryResourceTypeDefs,
  queryStudentTypeDefs,
  queryEnrollmentTypeDefs,
  queryCalendarTypeDefs,
  queryCalendarEventTypeDefs,
  mutationCourseTypeDefs,
  mutationResourceTypeDefs,
  mutationStudentTypeDefs,
  mutationEnrollmentTypeDefs,
  mutationCalendarEventTypeDefs,
].join('\n');
