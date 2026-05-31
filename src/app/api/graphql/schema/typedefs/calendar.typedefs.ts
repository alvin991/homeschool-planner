export const calendarTypeDefs = `#graphql
    type DayViewLesson {
        enrollment_id: ID!
        sequence: Int!
        course_title: String!
        subject_color: String!
        lesson_title: String!
        content: String!
        note: String!
        day_number: Int
        total_days: Int
        status: LessonOccurrenceStatus!
    }

    type DayView {
        date: String!
        studentName: String!
        lessons: [DayViewLesson!]!
    }

    type MonthView {
        month: String!      # e.g. "2026-06"
        days: [DayView!]!  # one entry per day that has lessons
    }
`;
