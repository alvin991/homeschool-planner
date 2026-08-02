export const enrollmentTypeDefs = `#graphql
  type Enrollment {
    _id: ID!
    student: ID! # Replace with User type if needed
    course: ID!
    enrollment_date: String!
    start_date: String!
    end_date: String
    weekdays: [Int!]!
    week_interval: Int!
    lesson_rate: Float!
    status: EnrollmentStatus!
    suspension_periods: [SuspensionPeriod!]!
    lesson_snapshot: [LessonSnapshot!]!
    lesson_occurrences: [LessonOccurrence!]!
    scheduled_dates: [String!]!
    last_synced_at: String!
  }

  type SuspensionPeriod {
    start: String!
    end: String!
  }

  type LessonSnapshot {
    _id: ID!
    title: String!
    content: String
    note: String
  }

  type LessonOccurrence {
    sequence: Int!
    lessons: [LessonOccurrenceLesson!]!
  }

  type LessonOccurrenceLesson {
    lesson_id: ID!
    lesson_title: String!
    day_number: Int
    total_days: Int
    status: LessonOccurrenceStatus!
    completed_date: String
  }

  enum LessonOccurrenceStatus {
    pending
    completed
    skipped
  }

  enum EnrollmentStatus {
    active
    completed
    dropped
  }
`;