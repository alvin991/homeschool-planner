import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import type { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import Course, { ICourse } from '@/models/Course';
import '@/models/Lesson';
import Subject from '@/models/Subject';
import Publisher from '@/models/Publisher';

const typeDefs = `#graphql
  type Course {
    _id: ID!
    publisher: Publisher!
    title: String!
    grade: String!
    note: String
    lessons: [Lesson!]!
    lessonCount: Int!
    subject: Subject!
  }
  type Lesson {
    _id: ID!
    title: String!
    content: String
    note: String
    order: Int
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

  type Mutation {
    createCourse(input: CourseCreateInput!): Course!
    updateCourse(id: ID!, input: CourseUpdateInput!): Course!
  }
`;

const resolvers = {
  Query: {
    course: async (_: unknown, { id }: { id: string }) => {
      return await Course.findById(id).lean().populate('lessons').populate('subject').populate('publisher');
    },
    courses: async () => {
      return await Course.find({}).lean().populate('lessons').populate('subject').populate('publisher');
    },
    subjects: async () => {
      return await Subject.find({}).lean();
    },
    publishers: async () => {
      return await Publisher.find({}).lean();
    },
  },
  Course: {
    lessonCount: (parent: ICourse) => parent.lessons.length,
  },
  Mutation: {
    createCourse: async (
      _: unknown,
      { input }: { input: { title: string; grade: string; note?: string; publisherName: string; subjectName: string; subjectColor: string } },
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
        lessons: [],
        publisher: publisher._id,
        subject: subject._id,
      });

      return await Course.findById(course._id).lean().populate('lessons').populate('subject').populate('publisher');
    },

    updateCourse: async (
      _: unknown,
      { id, input }: { id: string; input: { title?: string; grade?: string; note?: string; publisherName?: string; subjectName?: string; subjectColor?: string } },
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

      return await Course.findById(courseDoc._id).lean().populate('lessons').populate('subject').populate('publisher');
    },
  },
};

const apolloServer = new ApolloServer({ typeDefs, resolvers });

export const POST = startServerAndCreateNextHandler<NextRequest>(apolloServer, {
  context: async () => {
    // Ensure mongoose is connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://homeschool_user:homeschool_password@db:27017/homeschool_planner?authSource=admin');
    }
    return {};
  },
});