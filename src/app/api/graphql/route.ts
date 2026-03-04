import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import type { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import Course, { ICourse } from '@/models/Course';
import Lesson from '@/models/Lesson';
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
  },
  Course: {
    lessons: async (parent: ICourse) => {
      return await Lesson.find({ _id: { $in: parent.lessons } });
    },
    lessonCount: (parent: ICourse) => {
      return parent.lessons.length;
    },
    subject: async (parent: ICourse) => {
      return await Subject.findById(parent.subject);
    },
    publisher: async (parent: ICourse) => {
      return await Publisher.findById(parent.publisher);
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