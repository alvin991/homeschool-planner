import CalendarEventModel from '@/models/CalendarEvent';
import { monthToDateRange } from '@/utils/dateUtils';

export const calendarEventResolvers = {
  Query: {
    calendarEvents: async (
      _: unknown,
      { studentId, month }: { studentId?: string; month?: string }
    ) => {
      const filter: Record<string, unknown> = {};

      if (month) {
        const { startDate, endDate } = monthToDateRange(month);
        filter.start_date = { $lte: endDate };
        filter.end_date = { $gte: startDate };
      }

      if (studentId) {
        filter.$or = [{ student: null }, { student: studentId }];
      }

      return await CalendarEventModel.find(filter).lean();
    },
  },
  Mutation: {
    createCalendarEvent: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          title: string;
          start_date: string;
          end_date: string;
          studentId?: string;
        };
      }
    ) => {
      const { studentId, ...rest } = input;
      const created = await CalendarEventModel.create({
        ...rest,
        student: studentId ?? null,
      });
      return created.toObject();
    },
    updateCalendarEvent: async (
      _: unknown,
      {
        id,
        input,
      }: {
        id: string;
        input: {
          title?: string;
          start_date?: string;
          end_date?: string;
          studentId?: string | null;
        };
      }
    ) => {
      const { studentId, ...rest } = input;
      const update = studentId !== undefined ? { ...rest, student: studentId } : rest;
      const updated = await CalendarEventModel.findByIdAndUpdate(id, { $set: update }, {
        returnDocument: 'after',
        runValidators: true,
      });
      if (!updated) throw new Error('CalendarEvent not found');
      return updated.toObject();
    },
    deleteCalendarEvent: async (_: unknown, { id }: { id: string }) => {
      const deleted = await CalendarEventModel.findByIdAndDelete(id);
      if (!deleted) throw new Error('CalendarEvent not found');
      return true;
    },
  },
};
