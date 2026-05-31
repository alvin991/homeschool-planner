export const mutationEnrollmentTypeDefs = `#graphql
  extend type Mutation {
    createEnrollment(input: EnrollmentCreateInput!): Enrollment!
    updateEnrollment(id: ID!, input: EnrollmentUpdateInput!): Enrollment!
    deleteEnrollment(id: ID!): Boolean!
    updateOccurrenceStatus(input: UpdateOccurrenceStatusInput!): Boolean!
  }
`;
