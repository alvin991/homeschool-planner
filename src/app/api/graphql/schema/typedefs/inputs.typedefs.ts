export const sharedInputsTypeDefs = `#graphql
  input CourseCreateInput {
    title: String!
    grade: String!
    note: String
    publisherName: String!
    subjectName: String!
    subjectColor: String!
  }

  input CourseUpdateInput {
    title: String
    grade: String
    note: String
    publisherName: String
    subjectName: String
    subjectColor: String
  }

  input SubjectUpdateInput {
    name: String
    color: String
  }

  input EnrollmentCreateInput {
    studentId: ID!
    courseId: ID!
    frequency: [Int!]
    lesson_rate: Float
    status: EnrollmentStatus
    suspension_periods: [SuspensionPeriodInput!]
  }

  input EnrollmentUpdateInput {
    enrollment_date: String
    frequency: [Int!]
    lesson_rate: Float
    status: EnrollmentStatus
    suspension_periods: [SuspensionPeriodInput!]
  }

  input SuspensionPeriodInput {
    start: String!
    end: String!
  }
`;
