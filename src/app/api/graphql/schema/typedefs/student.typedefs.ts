export const studentTypeDefs = `#graphql
  type Student {
    _id: ID!
    name: String!
    lesson_cutoff_time: String
  }

  input StudentCreateInput {
    name: String!
    lesson_cutoff_time: String
  }

  input StudentUpdateInput {
    name: String
    lesson_cutoff_time: String
  }
`;