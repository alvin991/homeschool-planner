"use client";
import { useState } from "react";
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import apolloClient from "@/utils/apolloClient";
import CoursesList from "./CoursesList";
import CourseDetails from "./CourseDetails";
import type { CourseType, CoursesData } from '@/app/courses/types';

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
  const { loading, error, data } = useQuery<CoursesData>(GET_COURSES, { client: apolloClient });
  const [selectedCourse, setSelectedCourse] = useState<CourseType | null>(null);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  const courses = data?.courses || [];

  const handleCourseClick = (course: CourseType) => {
    // Implement navigation to course details page
    console.log(`Navigate to course details for course ID: ${course._id}`);
    setSelectedCourse(course);
  };

  return (
    <div className="p-4">
      {!selectedCourse ? (
        <CoursesList courses={courses} handleCourseClick={handleCourseClick} />
      ) : (
        <CourseDetails course={selectedCourse} onBack={() => setSelectedCourse(null)} />
      )}
    </div>
  );
}

export default CoursesContainer;