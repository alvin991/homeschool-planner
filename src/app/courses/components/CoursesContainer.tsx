'use client';

import CoursesList from './CoursesList';
import CourseDetails from './CourseDetails';
import { useCoursesUI } from '../CoursesUIContext';
import type { CourseType } from '../types';
import { useCoursesQuery } from '../hooks/useCoursesQuery';

function CoursesContainer() {
  const { loading, error, data } = useCoursesQuery();
  const { selectedCourse, setSelectedCourse, setFormMode, setSelectedLessonTreeId } =
    useCoursesUI();

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  const courses = data?.courses || [];

  const handleCourseClick = (course: CourseType) => {
    setSelectedLessonTreeId(null);
    setSelectedCourse(course);
    setFormMode('course-edit');
    console.log(`course-edit`);
  };

  const handleBackToCoursesClick = () => {
    setSelectedLessonTreeId(null);
    setSelectedCourse(null);
    setFormMode('course-list');
    console.log(`course-list`);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {!selectedCourse ? (
          <CoursesList courses={courses} handleCourseClick={handleCourseClick} />
        ) : (
          <CourseDetails course={selectedCourse} onBack={handleBackToCoursesClick} />
        )}
      </div>
    </div>
  );
}

export default CoursesContainer;
