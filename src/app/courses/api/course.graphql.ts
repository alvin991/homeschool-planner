import { gql } from '@apollo/client';

const LESSON_TREE_SELECTION_DEPTH = 2;

function buildLessonTreeSelection(depth: number): string {
  const fields = `
    _id
    kind
    title
    order
    content
    note
  `;

  if (depth <= 0) return fields;
  return `
    ${fields}
    children {
      ${buildLessonTreeSelection(depth - 1)}
    }
  `;
}

const LESSON_TREE_NODE_FIELDS = buildLessonTreeSelection(LESSON_TREE_SELECTION_DEPTH);

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
      lessonTree {
        ${LESSON_TREE_NODE_FIELDS}
      }
      lessonCount
    }
  }
`;

export const UPDATE_COURSE_LESSON_TREE = gql`
  mutation UpdateCourseLessonTree($id: ID!, $lessonTree: [LessonTreeNodeInput!]!) {
    updateCourseLessonTree(id: $id, lessonTree: $lessonTree) {
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
      lessonTree {
        ${LESSON_TREE_NODE_FIELDS}
      }
      lessonCount
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
