export const queryResourceTypeDefs = `#graphql
  extend type Query {
    subjects: [Subject!]!
    publishers: [Publisher!]!
  }
`;
