import { gql } from '@apollo/client';

export const GET_ALL_CALENDAR_EVENTS = gql`
  query GetAllCalendarEvents {
    calendarEvents {
      _id
      title
      start_date
      end_date
      student
    }
  }
`;

export const CREATE_CALENDAR_EVENT = gql`
  mutation CreateCalendarEvent($title: String!, $start_date: String!, $end_date: String!, $studentId: ID) {
    createCalendarEvent(input: { title: $title, start_date: $start_date, end_date: $end_date, studentId: $studentId }) {
      _id
      title
      start_date
      end_date
      student
    }
  }
`;

export const UPDATE_CALENDAR_EVENT = gql`
  mutation UpdateCalendarEvent($id: ID!, $title: String!, $start_date: String!, $end_date: String!, $studentId: ID) {
    updateCalendarEvent(id: $id, input: { title: $title, start_date: $start_date, end_date: $end_date, studentId: $studentId }) {
      _id
      title
      start_date
      end_date
      student
    }
  }
`;

export const DELETE_CALENDAR_EVENT = gql`
  mutation DeleteCalendarEvent($id: ID!) {
    deleteCalendarEvent(id: $id)
  }
`;

export type CalendarEventRow = { _id: string; title: string; start_date: string; end_date: string; student: string | null; };
export type GetAllCalendarEventsData = { calendarEvents: CalendarEventRow[] };
