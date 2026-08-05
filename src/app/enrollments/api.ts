import { gql } from '@apollo/client';
import { MonthViewData } from '@/app/calendar/types';

export { GET_STUDENTS } from '@/app/resources/api/students.graphql';
export type { StudentRow, GetStudentsData } from '@/app/resources/api/students.graphql';

export const GET_COURSES_SLIM = gql`
  query GetCoursesSlim {
    courses {
      _id
      title
    }
  }
`;

export const GET_ENROLLMENTS = gql`
  query GetEnrollments($studentId: ID!) {
    enrollments(studentId: $studentId) {
      _id
      course
      start_date
      end_date
      weekdays
      lesson_rate
      status
      suspension_periods {
        start
        end
      }
    }
  }
`;

export const CREATE_ENROLLMENT = gql`
  mutation CreateEnrollment($input: EnrollmentCreateInput!) {
    createEnrollment(input: $input) {
      _id
      course
      start_date
      end_date
      weekdays
      lesson_rate
      status
      suspension_periods {
        start
        end
      }
    }
  }
`;

export const UPDATE_ENROLLMENT = gql`
  mutation UpdateEnrollment($id: ID!, $input: EnrollmentUpdateInput!) {
    updateEnrollment(id: $id, input: $input) {
      _id
      course
      start_date
      end_date
      weekdays
      lesson_rate
      status
      suspension_periods {
        start
        end
      }
    }
  }
`;

export const DELETE_ENROLLMENT = gql`
  mutation DeleteEnrollment($id: ID!) {
    deleteEnrollment(id: $id)
  }
`;

export const PREVIEW_ENROLLMENT_SCHEDULE = gql`
  query PreviewEnrollmentSchedule($input: EnrollmentCreateInput!) {
    previewEnrollmentSchedule(input: $input) {
      month
      days {
        date
        studentName
        lessons {
          sequence
          course_title
          course_abbr
          subject_color
          lesson_id
          lesson_title
          content
          note
          day_number
          total_days
          status
        }
      }
    }
  }
`;

export type CourseSlim = { _id: string; title: string };
export type GetCoursesSlimData = { courses: CourseSlim[] };

export type SuspensionPeriod = { start: string; end: string };
export type EnrollmentStatus = 'active' | 'completed' | 'dropped';

export type EnrollmentRow = {
  _id: string;
  course: string;
  start_date: string;
  end_date: string | null;
  weekdays: number[];
  lesson_rate: number;
  status: EnrollmentStatus;
  suspension_periods: SuspensionPeriod[];
};

export type GetEnrollmentsData = { enrollments: EnrollmentRow[] };

export type PreviewEnrollmentScheduleData = {
  previewEnrollmentSchedule: MonthViewData;
};