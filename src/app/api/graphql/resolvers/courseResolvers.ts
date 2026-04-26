import Course, { ICourse } from '@/models/Course';
import Publisher from '@/models/Publisher';
import Subject from '@/models/Subject';
import { countLessonLeaves } from '@/app/courses/courseTree';
import {
  lessonTreeInputToMongo,
  toLessonTreeNodeDTOs,
  type LessonTreeNodeDTO,
} from '@/app/api/graphql/lib/lessonTreeDto';

export const courseResolvers = {
  Query: {
    course: async (_: unknown, { id }: { id: string }) => {
      return await Course.findById(id).lean().populate('subject').populate('publisher');
    },
    courses: async () => {
      return await Course.find({}).lean().populate('subject').populate('publisher');
    },
  },
  Course: {
    lessonCount: (parent: ICourse & { lessonTree?: unknown[] }) =>
      countLessonLeaves(parent.lessonTree ?? []),
    lessonTree: (parent: { lessonTree?: unknown[] }) =>
      toLessonTreeNodeDTOs(parent.lessonTree ?? []),
  },
  LessonTreeNode: {
    title: (parent: LessonTreeNodeDTO) => parent.title ?? '',
  },
  Mutation: {
    createCourse: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          title: string;
          grade: string;
          note?: string;
          publisherName: string;
          subjectName: string;
          subjectColor: string;
        };
      },
    ) => {
      const publisher = await Publisher.findOneAndUpdate(
        { name: input.publisherName },
        { name: input.publisherName },
        { upsert: true, new: true },
      );

      const subject = await Subject.findOneAndUpdate(
        { name: input.subjectName },
        { name: input.subjectName, color: input.subjectColor },
        { upsert: true, new: true },
      );

      const course = await Course.create({
        title: input.title,
        grade: input.grade,
        note: input.note,
        lessonTree: [],
        publisher: publisher._id,
        subject: subject._id,
      });

      return await Course.findById(course._id).lean().populate('subject').populate('publisher');
    },

    updateCourse: async (
      _: unknown,
      {
        id,
        input,
      }: {
        id: string;
        input: {
          title?: string;
          grade?: string;
          note?: string;
          publisherName?: string;
          subjectName?: string;
          subjectColor?: string;
        };
      },
    ) => {
      const courseDoc = await Course.findById(id);
      if (!courseDoc) throw new Error('Course not found');

      if (input.title !== undefined) courseDoc.title = input.title;
      if (input.grade !== undefined) courseDoc.grade = input.grade;
      if (input.note !== undefined) courseDoc.note = input.note;

      if (input.publisherName !== undefined) {
        const publisher = await Publisher.findOneAndUpdate(
          { name: input.publisherName },
          { name: input.publisherName },
          { upsert: true, new: true },
        );
        courseDoc.publisher = publisher._id;
      }

      if (input.subjectName !== undefined || input.subjectColor !== undefined) {
        const currentSubject = await Subject.findById(courseDoc.subject);
        const nextSubjectName = input.subjectName ?? currentSubject?.name;
        const nextSubjectColor = input.subjectColor ?? currentSubject?.color;

        if (!nextSubjectName || !nextSubjectColor) {
          throw new Error('Missing subjectName/subjectColor for update');
        }

        const subject = await Subject.findOneAndUpdate(
          { name: nextSubjectName },
          { name: nextSubjectName, color: nextSubjectColor },
          { upsert: true, new: true },
        );
        courseDoc.subject = subject._id;
      }

      await courseDoc.save();

      return await Course.findById(courseDoc._id).lean().populate('subject').populate('publisher');
    },

    updateCourseLessonTree: async (
      _: unknown,
      { id, lessonTree }: { id: string; lessonTree: unknown },
    ) => {
      const mapped = lessonTreeInputToMongo(
        Array.isArray(lessonTree) ? lessonTree : [],
      );
      // Atomic $set avoids Mongoose __v races when multiple lessonTree updates overlap
      // (e.g. drag persist + refetch-driven UI + another mutation).
      const updated = await Course.findByIdAndUpdate(
        id,
        { $set: { lessonTree: mapped } },
        { new: true, runValidators: true },
      )
        .populate('subject')
        .populate('publisher')
        .lean();

      if (!updated) throw new Error('Course not found');
      return updated;
    },
  },
};
