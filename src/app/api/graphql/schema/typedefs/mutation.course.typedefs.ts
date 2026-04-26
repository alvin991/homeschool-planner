/** Base `Mutation` root — other modules use `extend type Mutation`. */
export const mutationCourseTypeDefs = `#graphql
  type Mutation {
    createCourse(input: CourseCreateInput!): Course!
    updateCourse(id: ID!, input: CourseUpdateInput!): Course!
    updateCourseLessonTree(id: ID!, lessonTree: [LessonTreeNodeInput!]!): Course!
  }
`;
