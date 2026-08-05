export type LessonOccurrenceStatus = 'pending' | 'completed' | 'skipped';

export type DayViewLesson = {
  enrollment_id: string;
  lesson_id: string;
  sequence: number;
  course_title: string;
  subject_color: string;
  lesson_title: string;
  content: string;
  note: string;
  day_number?: number | null;
  total_days?: number | null;
  status: LessonOccurrenceStatus;
};

export type DayView = {
  date: string;
  studentName: string;
  lessons: DayViewLesson[];
};

export type GetCalendarDayViewData = {
  calendarDayView: DayView;
};

export type MonthViewLesson = {
  enrollment_id: string;
  lesson_id: string;
  course_title: string;
  course_abbr: string;
  subject_color: string;
  lesson_title: string;
  status: LessonOccurrenceStatus;
  sequence: number;
};

export type MonthViewDay = {
  date: string;
  lessons: MonthViewLesson[];
};

export type MonthViewData = {
  month: string;
  days: MonthViewDay[];
};

export type GetCalendarMonthViewData = {
  calendarMonthView: MonthViewData;
};
