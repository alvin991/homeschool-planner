export const queryCalendarTypeDefs = `#graphql
    extend type Query {
        calendarDayView(studentId: ID!, date: String!): DayView!
        calendarMonthView(studentId: ID!, month: String!): MonthView!
    }
`;
