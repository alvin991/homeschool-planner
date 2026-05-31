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

  input SuspensionPeriodInput {
    start: String!
    end: String!
  }

  input EnrollmentCreateInput {
    studentId: ID!
    courseId: ID!
    start_date: String!
    end_date: String
    weekdays: [Int!]
    week_interval: Int
    lesson_rate: Float
    status: EnrollmentStatus
    suspension_periods: [SuspensionPeriodInput!]
  }

  input EnrollmentUpdateInput {
    studentId: ID
    courseId: ID
    start_date: String
    end_date: String
    weekdays: [Int!]
    week_interval: Int
    lesson_rate: Float
    status: EnrollmentStatus
    suspension_periods: [SuspensionPeriodInput!]
  }

  input UpdateOccurrenceStatusInput {
    enrollmentId: ID!
    sequence: Int!
    status: LessonOccurrenceStatus!
    completedDate: String
  }
`;
