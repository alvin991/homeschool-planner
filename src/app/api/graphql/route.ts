import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import type { NextRequest } from 'next/server';
import mongoose, { Types } from 'mongoose';
import Course, { ICourse } from '@/models/Course';
import Subject from '@/models/Subject';
import Publisher from '@/models/Publisher';
import { countLessonLeaves } from '@/app/courses/courseTree';

function toIdString(id: unknown): string {
  if (id != null && typeof id === 'object' && 'toString' in id) {
    return (id as { toString(): string }).toString();
  }
  return String(id);
}

type LessonTreeNode = {
  _id: string;
  kind: 'lesson' | 'folder';
  title?: string;
  order: number;
  content?: string | null;
  note?: string | null;
  children: LessonTreeNode[];
};

function lessonTreeToGraphQL(nodes: unknown[] | undefined | null): LessonTreeNode[] {
  if (!Array.isArray(nodes) || !nodes.length) return [];
  return nodes.map((raw) => {
    const n = raw as {
      _id: unknown;
      kind?: string;
      title?: string;
      order?: number;
      content?: string;
      note?: string;
      children?: unknown[];
    };
    const id = toIdString(n._id);
    if (n.kind === 'folder') {
      return {
        _id: id,
        kind: 'folder',
        title: n.title,
        order: n.order ?? 0,
        children: lessonTreeToGraphQL(n.children as unknown[]),
      };
    }
    return {
      _id: id,
      kind: 'lesson',
      title: n.title,
      order: n.order ?? 0,
      content: n.content ?? null,
      note: n.note ?? null,
      children: [],
    };
  });
}

const OBJECT_ID_HEX = /^[a-f\d]{24}$/i;

function mapClientLessonTreeToMongo(nodes: unknown): unknown[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.map((raw, index) => {
    const n = raw as {
      kind?: string;
      id?: string;
      _id?: string;
      title?: string;
      order?: number;
      content?: string;
      note?: string;
      children?: unknown[];
    };
    const order = n.order ?? index;
    const kind = typeof n.kind === 'string' ? n.kind.toLowerCase() : '';
    if (kind === 'folder') {
      const base: Record<string, unknown> = {
        kind: 'folder',
        title: n.title,
        order,
        children: mapClientLessonTreeToMongo(n.children ?? []),
      };
      const oid = n.id ?? n._id;
      if (oid && OBJECT_ID_HEX.test(String(oid))) {
        base._id = new Types.ObjectId(String(oid));
      }
      return base;
    }
    const base: Record<string, unknown> = {
      kind: 'lesson',
      title: n.title,
      order,
      content: n.content ?? undefined,
      note: n.note ?? undefined,
    };
    const oid = n.id ?? n._id;
    if (oid && OBJECT_ID_HEX.test(String(oid))) {
      base._id = new Types.ObjectId(String(oid));
    }
    return base;
  });
}

const typeDefs = `#graphql
  enum LessonTreeNodeKind {
    lesson
    folder
  }

  type LessonTreeNode {
    _id: ID!
    kind: LessonTreeNodeKind!
    title: String!
    order: Int!
    content: String
    note: String
    children: [LessonTreeNode!]!
  }

  type Course {
    _id: ID!
    publisher: Publisher!
    title: String!
    grade: String!
    note: String
    lessonTree: [LessonTreeNode!]!
    lessonCount: Int!
    subject: Subject!
  }
  type Subject {
    _id: ID!
    name: String!
    color: String!
  }
  type Publisher {
    _id: ID!
    name: String!
  }
  type Query {
    course(id: ID!): Course
    courses: [Course!]!
    subjects: [Subject!]!
    publishers: [Publisher!]!
  }

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

  input LessonTreeNodeInput {
    _id: ID
    kind: LessonTreeNodeKind!
    title: String!
    order: Int
    content: String
    note: String
    children: [LessonTreeNodeInput!]
  }

  type Mutation {
    createCourse(input: CourseCreateInput!): Course!
    updateCourse(id: ID!, input: CourseUpdateInput!): Course!
    updateCourseLessonTree(id: ID!, lessonTree: [LessonTreeNodeInput!]!): Course!
  }
`;

const resolvers = {
  Query: {
    course: async (_: unknown, { id }: { id: string }) => {
      return await Course.findById(id).lean().populate('subject').populate('publisher');
    },
    courses: async () => {
      return await Course.find({}).lean().populate('subject').populate('publisher');
    },
    subjects: async () => {
      return await Subject.find({}).lean();
    },
    publishers: async () => {
      return await Publisher.find({}).lean();
    },
  },
  Course: {
    lessonCount: (parent: ICourse & { lessonTree?: unknown[] }) =>
      countLessonLeaves(parent.lessonTree ?? []),
    lessonTree: (parent: { lessonTree?: unknown[] }) =>
      lessonTreeToGraphQL(parent.lessonTree ?? []),
  },
  LessonTreeNode: {
    title: (parent: LessonTreeNode) => parent.title ?? '',
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
      const mapped = mapClientLessonTreeToMongo(
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

const apolloServer = new ApolloServer({ typeDefs, resolvers });

const graphqlHandler = startServerAndCreateNextHandler<NextRequest>(apolloServer, {
  context: async () => {
    if (mongoose.connection.readyState === 0) {
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        throw new Error('Missing MONGODB_URI in environment (.env for local dev).');
      }
      await mongoose.connect(uri);
    }
    return {};
  },
});

/** App Router requires `(req, context)`; Apollo handler is `(req)` only. */
export async function POST(
  request: NextRequest,
  _context: { params: Promise<Record<string, never>> },
) {
  return graphqlHandler(request);
}
