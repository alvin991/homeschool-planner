import StudentModel from '@/models/Student';

export const studentResolvers = {
  Query: {
    student: async (_: unknown, { id }: { id: string }) => {
      return await StudentModel.findById(id).lean();
    },
    students: async () => {
      return await StudentModel.find().lean();
    },
  },
  Mutation: {
    createStudent: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          name: string;
        };
      }
    ) => {
      const newStudent = await StudentModel.create(input);
      return newStudent.toObject();
    },
    updateStudent: async (
      _: unknown,
      {
        id,
        input,
      }: {
        id: string;
        input: {
          name: string;
        };
      }
    ) => {
      const updatedStudent = await StudentModel.findByIdAndUpdate(
        id,
        { $set: input },
        {
          returnDocument: 'after',
          runValidators: true,
        }
      );
      if (!updatedStudent) {
        throw new Error('Student not found');
      }
      return updatedStudent.toObject();
    },
    deleteStudent: async (_: unknown, { id }: { id: string }) => {
      const deleted = await StudentModel.findByIdAndDelete(id);
      if (!deleted) throw new Error('Student not found');
      return true;
    },
  },
};
