export const mutationResourceTypeDefs = `#graphql
  extend type Mutation {
    createPublisher(name: String!): Publisher!
    updatePublisher(id: ID!, name: String!): Publisher!
    deletePublisher(id: ID!): Boolean!
    createSubject(name: String!, color: String!): Subject!
    updateSubject(id: ID!, input: SubjectUpdateInput!): Subject!
    deleteSubject(id: ID!): Boolean!
  }
`;
