export const queryEnrollmentTypeDefs = `#graphql
  extend type Query {
    enrollment(id: ID!): Enrollment
    enrollments(studentId: ID!): [Enrollment!]!
    previewEnrollmentSchedule(input: EnrollmentCreateInput!): MonthView!
  }
`;