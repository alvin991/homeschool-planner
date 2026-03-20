import { gql } from '@apollo/client';

export const GET_COURSES = gql`
  query GetCourses {
    courses {
      _id
      title
      grade
      publisher {
        _id
        name
      }
      subject {
        _id
        name
        color
      }
      lessons {
        _id
        title
        content
        note
        order
      }
    }
  }
`;

export const GET_COURSE_FORM_META = gql`
  query GetCourseFormMeta {
    subjects {
      _id
      name
      color
    }
    publishers {
      _id
      name
    }
  }
`;

export const CREATE_COURSE = gql`
  mutation CreateCourse($input: CourseCreateInput!) {
    createCourse(input: $input) {
      _id
      title
      grade
      publisher {
        _id
        name
      }
      subject {
        _id
        name
        color
      }
    }
  }
`;

export const UPDATE_COURSE = gql`
  mutation UpdateCourse($id: ID!, $input: CourseUpdateInput!) {
    updateCourse(id: $id, input: $input) {
      _id
      title
      grade
      publisher {
        _id
        name
      }
      subject {
        _id
        name
        color
      }
    }
  }
`;
