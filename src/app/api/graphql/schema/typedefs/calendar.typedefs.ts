export const calendarTypeDefs = `#graphql
    type DayViewLesson {
        lesson_id: ID!
        enrollment_id: ID!
        sequence: Int!
        course_title: String!
        course_abbr: String!
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

    type MonthViewLesson {
        lesson_id: ID!
        enrollment_id: ID!
        sequence: Int!
        course_title: String!
        course_abbr: String!
        subject_color: String!
        lesson_title: String!
        content: String!
        note: String!
        day_number: Int
        total_days: Int
        status: LessonOccurrenceStatus!
        can_reschedule_remaining: Boolean!
    }

    type MonthViewDay {
        date: String!
        studentName: String!
        lessons: [MonthViewLesson!]!
    }

    type MonthView {
        month: String!      # e.g. "2026-06"
        days: [MonthViewDay!]!  # one entry per day that has lessons
    }
`;
