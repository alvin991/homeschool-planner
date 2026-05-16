import { gql } from '@apollo/client';

export const GET_STUDENTS = gql`
  query GetStudents {
    students {
      _id
      name
    }
  }
`;

export const CREATE_STUDENT = gql`
  mutation CreateStudent($name: String!) {
    createStudent(input: { name: $name }) {
      _id
      name
    }
  }
`;

export const UPDATE_STUDENT = gql`
  mutation UpdateStudent($id: ID!, $name: String!) {
    updateStudent(id: $id, input: { name: $name }) {
      _id
      name
    }
  }
`;

export const DELETE_STUDENT = gql`
  mutation DeleteStudent($id: ID!) {
    deleteStudent(id: $id)
  }
`;

export type StudentRow = { _id: string; name: string };
export type GetStudentsData = { students: StudentRow[] };
