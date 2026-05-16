export const mutationStudentTypeDefs = `#graphql
  extend type Mutation {
    createStudent(input: StudentCreateInput!): Student!
    updateStudent(id: ID!, input: StudentUpdateInput!): Student!
    deleteStudent(id: ID!): Boolean!
  }
`;