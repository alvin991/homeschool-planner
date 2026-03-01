import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import type { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import Course, { ICourse } from '@/models/Course';
import Lesson from '@/models/Lesson';

const typeDefs = `#graphql
  type Course {
    _id: ID!
    publisher: String!
    title: String!
    frGrade: String!
    toGrade: String!
    note: String
    lessons: [Lesson!]!
    lessonCount: Int!
  }
  type Lesson {
    _id: ID!
    title: String!
    content: String
    note: String
    order: Int
  }
  type Query {
    course(id: ID!): Course
  }
`;

const resolvers = {
  Query: {
    course: async (_: unknown, { id }: { id: string }) => {
      return await Course.findById(id).populate('lessons');
    },
  },
  Course: {
    lessons: async (parent: ICourse) => {
      return await Lesson.find({ _id: { $in: parent.lessons } });
    },
    lessonCount: (parent: ICourse) => {
      return parent.lessons.length;
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