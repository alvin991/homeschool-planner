import { gql } from '@apollo/client';

export const GET_PUBLISHERS = gql`
  query GetPublishers {
    publishers {
      _id
      name
    }
  }
`;

export const GET_SUBJECTS = gql`
  query GetSubjects {
    subjects {
      _id
      name
      color
    }
  }
`;

export const CREATE_PUBLISHER = gql`
  mutation CreatePublisher($name: String!) {
    createPublisher(name: $name) {
      _id
      name
    }
  }
`;

export const UPDATE_PUBLISHER = gql`
  mutation UpdatePublisher($id: ID!, $name: String!) {
    updatePublisher(id: $id, name: $name) {
      _id
      name
    }
  }
`;

export const DELETE_PUBLISHER = gql`
  mutation DeletePublisher($id: ID!) {
    deletePublisher(id: $id)
  }
`;

export const CREATE_SUBJECT = gql`
  mutation CreateSubject($name: String!, $color: String!) {
    createSubject(name: $name, color: $color) {
      _id
      name
      color
    }
  }
`;

export const UPDATE_SUBJECT = gql`
  mutation UpdateSubject($id: ID!, $input: SubjectUpdateInput!) {
    updateSubject(id: $id, input: $input) {
      _id
      name
      color
    }
  }
`;

export const DELETE_SUBJECT = gql`
  mutation DeleteSubject($id: ID!) {
    deleteSubject(id: $id)
  }
`;

export type PublisherRow = { _id: string; name: string };
export type SubjectRow = { _id: string; name: string; color: string };

export type GetPublishersData = { publishers: PublisherRow[] };
export type GetSubjectsData = { subjects: SubjectRow[] };
