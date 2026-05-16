export const enrollmentTypeDefs = `#graphql
  type Enrollment {
    _id: ID!
    student: ID! # Replace with User type if needed
    course: ID!
    enrollment_date: String!
    frequency: [Int!]!
    lesson_rate: Float!
    status: EnrollmentStatus!
    suspension_periods: [SuspensionPeriod!]!
  }

  type SuspensionPeriod {
    start: String!
    end: String!
  }

  enum EnrollmentStatus {
    active
    completed
    dropped
  }
`;