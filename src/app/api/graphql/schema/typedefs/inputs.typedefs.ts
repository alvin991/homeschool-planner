export const sharedInputsTypeDefs = `#graphql
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

  input SubjectUpdateInput {
    name: String
    color: String
  }
`;
