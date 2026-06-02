export const courseTypeDefs = `#graphql
  type Course {
    _id: ID!
    publisher: Publisher!
    title: String!
    abbr: String!
    grade: String!
    note: String
    lessonTree: [LessonTreeNode!]!
    lessonCount: Int!
    subject: Subject!
  }
`;
