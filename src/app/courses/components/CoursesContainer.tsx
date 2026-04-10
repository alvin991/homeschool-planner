'use client';

import { useEffect, useMemo } from 'react';
import CoursesList from './CoursesList';
import CourseDetails from './CourseDetails';
import { useCoursesUI } from '../CoursesUIContext';
import type { CourseType } from '../types';
import { useCoursesQuery } from '../hooks/useCoursesQuery';
import { useCoursesBreadcrumb } from '@/app/top-menu/CoursesBreadcrumbContext';

const EMPTY_COURSES: CourseType[] = [];

function CoursesContainer() {
  const { loading, error, data } = useCoursesQuery();
  const {
    selectedCourse,
    setSelectedCourse,
    setFormMode,
    setSelectedLessonTreeId,
  } = useCoursesUI();
  const { setSelectedCourseBreadcrumb } = useCoursesBreadcrumb();
  const courses = data?.courses ?? EMPTY_COURSES;

  const courseForDetails = useMemo(() => {
    if (!selectedCourse) return null;
    return courses.find((c) => c._id === selectedCourse._id) ?? selectedCourse;
  }, [courses, selectedCourse]);

  useEffect(() => {
    if (!selectedCourse) {
      setSelectedCourseBreadcrumb(null, null);
      return;
    }
    const title = courseForDetails?.title ?? selectedCourse.title;
    setSelectedCourseBreadcrumb(selectedCourse._id, title);
  }, [selectedCourse, courseForDetails, setSelectedCourseBreadcrumb]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  const handleCourseClick = (course: CourseType) => {
    setSelectedLessonTreeId(null);
    setSelectedCourse(course);
    setFormMode('course-edit');
    console.log(`course-edit`);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        {!selectedCourse ? (
          <CoursesList courses={courses} handleCourseClick={handleCourseClick} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <CourseDetails course={courseForDetails!} />
          </div>
        )}
      </div>
    </div>
  );
}

export default CoursesContainer;
