import CoursesHeader from "./CoursesHeader";
import CourseCard from "./CourseCard";
import { useMemo, useState } from 'react';
import type { CourseType } from '../types';
import { useCoursesUI } from '../CoursesUIContext';

type CoursesListProps = {
  courses: CourseType[];
  handleCourseClick: (course: CourseType) => void;
};

function CoursesList({ courses, handleCourseClick }: CoursesListProps) {
  const { setFormMode, setSelectedCourse, setSelectedLessonTreeId } = useCoursesUI();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAscending, setSortAscending] = useState(true);

  const handleAddCourse = () => {
    setSelectedLessonTreeId(null);
    setFormMode('course-new');
    setSelectedCourse({
      _id: '',
      title: '',
      grade: '',
      publisher: { _id: '', name: '' },
      subject: { _id: '', name: '', color: '' },
      lessonTree: [],
    });
  };

  const visibleCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = !query
      ? courses
      : courses.filter((course) => {
          const gradeValue = (course.grade ?? '').toString().trim().toLowerCase();
          const normalizedGradeTerm = gradeValue ? `grade ${gradeValue}` : '';
          const haystack = [
            course.title,
            course.publisher?.name,
            course.subject?.name,
            gradeValue,
            normalizedGradeTerm,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(query);
        });

    const sorted = [...filtered].sort((a, b) => {
      const diff = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      return sortAscending ? diff : -diff;
    });
    return sorted;
  }, [courses, searchQuery, sortAscending]);

  const handleToggleSort = () => {
    setSortAscending((prev) => !prev);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Courses</h1>
        <button
          type="button"
          onClick={handleAddCourse}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Add Course
        </button>
      </div>
      <CoursesHeader
        onSearchChange={setSearchQuery}
        sortAscending={sortAscending}
        onToggleSort={handleToggleSort}
      />
      {visibleCourses.length === 0 ? (
        <p className="text-sm text-gray-500">No courses match your search.</p>
      ) : (
        visibleCourses.map((course) => (
          <div
            key={course._id}
            className="mb-4"
            onClick={() => handleCourseClick(course)}
          >
            <CourseCard course={course} />
          </div>
        ))
      )}
    </div>
  );
}

export default CoursesList;