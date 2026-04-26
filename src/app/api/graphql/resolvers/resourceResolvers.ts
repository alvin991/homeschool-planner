import Course from '@/models/Course';
import Publisher from '@/models/Publisher';
import Subject from '@/models/Subject';

export const resourceResolvers = {
  Query: {
    subjects: async () => {
      return await Subject.find({}).lean();
    },
    publishers: async () => {
      return await Publisher.find({}).lean();
    },
  },
  Mutation: {
    createPublisher: async (_: unknown, { name }: { name: string }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Publisher name is required');
      const created = await Publisher.create({ name: trimmed });
      return created.toObject();
    },

    updatePublisher: async (_: unknown, { id, name }: { id: string; name: string }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Publisher name is required');
      const updated = await Publisher.findByIdAndUpdate(
        id,
        { name: trimmed },
        { new: true, runValidators: true },
      ).lean();
      if (!updated) throw new Error('Publisher not found');
      return updated;
    },

    deletePublisher: async (_: unknown, { id }: { id: string }) => {
      const inUse = await Course.countDocuments({ publisher: id });
      if (inUse > 0) {
        throw new Error(
          `Cannot delete publisher: ${inUse} course(s) still reference it.`,
        );
      }
      const deleted = await Publisher.findByIdAndDelete(id);
      if (!deleted) throw new Error('Publisher not found');
      return true;
    },

    createSubject: async (_: unknown, { name, color }: { name: string; color: string }) => {
      const trimmedName = name.trim();
      const trimmedColor = color.trim();
      if (!trimmedName) throw new Error('Subject name is required');
      if (!trimmedColor) throw new Error('Subject color is required');
      const created = await Subject.create({ name: trimmedName, color: trimmedColor });
      return created.toObject();
    },

    updateSubject: async (
      _: unknown,
      { id, input }: { id: string; input: { name?: string; color?: string } },
    ) => {
      const doc = await Subject.findById(id);
      if (!doc) throw new Error('Subject not found');
      if (input.name !== undefined) {
        const trimmed = input.name.trim();
        if (!trimmed) throw new Error('Subject name cannot be empty');
        doc.name = trimmed;
      }
      if (input.color !== undefined) {
        const trimmed = input.color.trim();
        if (!trimmed) throw new Error('Subject color cannot be empty');
        doc.color = trimmed;
      }
      await doc.save();
      return doc.toObject();
    },

    deleteSubject: async (_: unknown, { id }: { id: string }) => {
      const inUse = await Course.countDocuments({ subject: id });
      if (inUse > 0) {
        throw new Error(`Cannot delete subject: ${inUse} course(s) still reference it.`);
      }
      const deleted = await Subject.findByIdAndDelete(id);
      if (!deleted) throw new Error('Subject not found');
      return true;
    },
  },
};
