'use client';

import { useQuery } from '@apollo/client/react';
import apolloClient from '@/utils/apolloClient';
import { GET_COURSES } from '../api/course.graphql';
import type { CoursesData } from '../types';

export function useCoursesQuery() {
  return useQuery<CoursesData>(GET_COURSES, {
    client: apolloClient,
  });
}
