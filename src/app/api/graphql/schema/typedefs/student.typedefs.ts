export const studentTypeDefs = `#graphql
  type Student {
    _id: ID!
    name: String!
  }

  input StudentCreateInput {
    name: String!
  }

  input StudentUpdateInput {
    name: String
  }
`;