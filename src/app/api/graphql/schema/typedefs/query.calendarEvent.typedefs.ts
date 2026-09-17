export const queryCalendarEventTypeDefs = `#graphql
  extend type Query {
    calendarEvents(studentId: ID, month: String): [CalendarEvent!]!
  }
`;
