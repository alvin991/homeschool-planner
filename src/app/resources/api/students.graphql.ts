import { gql } from '@apollo/client';

export const GET_STUDENTS = gql`
  query GetStudents {
    students {
      _id
      name
      lesson_cutoff_time
    }
  }
`;

export const CREATE_STUDENT = gql`
  mutation CreateStudent($name: String!) {
    createStudent(input: { name: $name }) {
      _id
      name
      lesson_cutoff_time
    }
  }
`;

export const UPDATE_STUDENT = gql`
  mutation UpdateStudent($id: ID!, $name: String!, $lesson_cutoff_time: String) {
    updateStudent(id: $id, input: { name: $name, lesson_cutoff_time: $lesson_cutoff_time }) {
      _id
      name
      lesson_cutoff_time
    }
  }
`;

export const DELETE_STUDENT = gql`
  mutation DeleteStudent($id: ID!) {
    deleteStudent(id: $id)
  }
`;

export type StudentRow = { _id: string; name: string; lesson_cutoff_time: string; };
export type GetStudentsData = { students: StudentRow[] };
