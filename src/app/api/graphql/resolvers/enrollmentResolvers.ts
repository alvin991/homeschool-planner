import Enrollment from '@/models/Enrollment';

export const enrollmentResolvers = {
  Query: {
    enrollment: async (_: unknown, { id }: { id: string }) => {
      return await Enrollment.findById(id).lean();
    },
    enrollments: async (_: unknown, { studentId }: { studentId: string }) => {
      return await Enrollment.find({ student: studentId }).lean();
    },
  },
  Mutation: {
    createEnrollment: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          studentId: string;
          courseId: string;
          frequency?: Array<number>;
          lesson_rate?: number;
          status?: 'active' | 'completed' | 'dropped';
          suspension_periods?: Array<{ start: Date; end: Date }>;
        };
      }
    ) => {
      const newEnrollment = await Enrollment.create({
        student: input.studentId,
        course: input.courseId,
        frequency: input.frequency,
        lesson_rate: input.lesson_rate,
        status: input.status,
        suspension_periods: input.suspension_periods,
      });

      return newEnrollment.toObject();
    },
    updateEnrollment: async (
      _: unknown,
      {
        id,
        input,
      }: {
        id: string;
        input: {
          studentId?: string;
          courseId?: string;
          frequency?: Array<number>;
          lesson_rate?: number;
          status?: 'active' | 'completed' | 'dropped';
          suspension_periods?: Array<{ start: Date; end: Date }>;
        };
      }
    ) => {
      const updates: Record<string, unknown> = {};
      if (input.studentId !== undefined) updates.student = input.studentId;
      if (input.courseId !== undefined) updates.course = input.courseId;
      if (input.frequency !== undefined) updates.frequency = input.frequency;
      if (input.lesson_rate !== undefined)
        updates.lesson_rate = input.lesson_rate;
      if (input.status !== undefined) updates.status = input.status;
      if (input.suspension_periods !== undefined)
        updates.suspension_periods = input.suspension_periods;

      const updatedEnrollment = await Enrollment.findByIdAndUpdate(
        id,
        {
            $set: updates,
        },
        { returnDocument: 'after', runValidators: true }
      );
      if (!updatedEnrollment) throw new Error('Enrollment not found');
      return updatedEnrollment;
    },
    deleteEnrollment: async (_: unknown, { id }: { id: string }) => {
      const deletedEnrollment = await Enrollment.findByIdAndDelete(id);
      if (!deletedEnrollment) throw new Error('Enrollment not found');
      return true;
    },
  },
};
