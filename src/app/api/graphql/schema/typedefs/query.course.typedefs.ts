/** Base `Query` root — other modules use `extend type Query`. */
export const queryCourseTypeDefs = `#graphql
  type Query {
    course(id: ID!): Course
    courses: [Course!]!
  }
`;
