'use client';

import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import apolloClient from '@/utils/apolloClient';
import CoursesList from './CoursesList';
import CourseDetails from './CourseDetails';
import { useCoursesUI } from '../CoursesUIContext';
import type { CourseType, CoursesData } from '../types';

const GET_COURSES = gql`
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

function CoursesContainer() {
  const { loading, error, data } = useQuery<CoursesData>(GET_COURSES, {
    client: apolloClient,
  });
  const { selectedCourse, setSelectedCourse } = useCoursesUI();

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  const courses = data?.courses || [];

  const handleCourseClick = (course: CourseType) => {
    setSelectedCourse(course);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {!selectedCourse ? (
          <CoursesList courses={courses} handleCourseClick={handleCourseClick} />
        ) : (
          <CourseDetails course={selectedCourse} onBack={() => setSelectedCourse(null)} />
        )}
      </div>
    </div>
  );
}

export default CoursesContainer;