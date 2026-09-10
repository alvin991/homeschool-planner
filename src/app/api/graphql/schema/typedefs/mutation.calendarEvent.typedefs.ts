export const mutationCalendarEventTypeDefs = `#graphql
  extend type Mutation {
    createCalendarEvent(input: CalendarEventCreateInput!): CalendarEvent!
    updateCalendarEvent(id: ID!, input: CalendarEventUpdateInput!): CalendarEvent!
    deleteCalendarEvent(id: ID!): Boolean!
  }
`;
