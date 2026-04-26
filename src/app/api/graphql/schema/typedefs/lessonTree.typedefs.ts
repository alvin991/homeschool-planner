export const lessonTreeTypeDefs = `#graphql
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

  input LessonTreeNodeInput {
    _id: ID
    kind: LessonTreeNodeKind!
    title: String!
    order: Int
    content: String
    note: String
    children: [LessonTreeNodeInput!]
  }
`;
