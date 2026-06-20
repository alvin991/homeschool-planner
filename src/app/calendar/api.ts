import { gql } from '@apollo/client';

export const GET_DAY_VIEW = gql`
  query GetDayView($studentId: ID!, $date: String!) {
    calendarDayView(studentId: $studentId, date: $date) {
      date
      studentName
      lessons {
        enrollment_id
        sequence
        course_title
        subject_color
        lesson_title
        content
        note
        day_number
        total_days
        status
      }
    }
  }
`;

export const UPDATE_OCCURRENCE_STATUS = gql`
  mutation UpdateOccurrenceStatus($input: UpdateOccurrenceStatusInput!) {
    updateOccurrenceStatus(input: $input)
  }
`;

export const GET_MONTH_VIEW = gql`
  query GetMonthView($studentId: ID!, $month: String!) {
    calendarMonthView(studentId: $studentId, month: $month) {
      month
      days {
        date
        studentName
        lessons {
          enrollment_id
          course_title
          subject_color
          lesson_title
          status
        }
      }
    }
  }
`;
