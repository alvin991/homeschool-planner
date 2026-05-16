export const queryStudentTypeDefs = `#graphql
  extend type Query {
    student(id: ID!): Student
    students: [Student!]!
  }
`;