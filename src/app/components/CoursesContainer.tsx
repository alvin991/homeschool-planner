"use client";
import CoursesHeader from "./CoursesHeader";
import CourseCard from "./CourseCard";
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import apolloClient from "@/utils/apolloClient";

export type subjectType = {
  _id: number;
  name: string;
  color: string;
};

export type LessonType = {
  _id: number;
  title: string;
  content: string;
  note: string;
  order: number;
};

export type PublisherType = {
  _id: number;
  name: string;
};

export type CourseType = {
  _id: number;
  title: string;
  publisher: PublisherType;
  grade: string;
  subject: subjectType;
  lessons: LessonType[]; // Define a Lesson type as well if needed
};

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

export type CoursesData = {
  courses: CourseType[];
};

function CoursesContainer() {
  const { loading, error, data } = useQuery<CoursesData>(GET_COURSES, { client: apolloClient });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  const courses = data?.courses || [];
  console.log("Fetched courses:", JSON.stringify(courses, null, 2));

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Course List</h1>
      {/* Course list content will go here */}
      <CoursesHeader />
      {/* <CoursesList courses={courses} /> */}
      { courses && courses.length > 0 && courses.map(course => (
        <div key={course._id} className="mb-4">
          <CourseCard course={course} />
        </div>
      ))}

    </div>
  );
}

export default CoursesContainer;