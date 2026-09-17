export const calendarEventTypeDefs = `#graphql
  type CalendarEvent {
    _id: ID!
    title: String!
    start_date: String!
    end_date: String!
    student: ID
  }

  input CalendarEventCreateInput {
    title: String!
    start_date: String!
    end_date: String!
    studentId: ID
  }

  input CalendarEventUpdateInput {
    title: String
    start_date: String
    end_date: String
    studentId: ID
  }
`;
