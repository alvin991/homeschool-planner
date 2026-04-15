import CoursesHeader from "./CoursesHeader";
import CourseCard from "./CourseCard";
import type { CourseType } from '../types';
import { useCoursesUI } from '../CoursesUIContext';

type CoursesListProps = {
  courses: CourseType[];
  handleCourseClick: (course: CourseType) => void;
};

function CoursesList({ courses, handleCourseClick }: CoursesListProps) {
  const { setFormMode, setSelectedCourse, setSelectedLessonTreeId } = useCoursesUI();
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
      {/* <CoursesHeader /> */}
      {courses &&
        courses.length > 0 &&
        courses.map((course) => (
          <div
            key={course._id}
            className="mb-4"
            onClick={() => handleCourseClick(course)}
          >
            <CourseCard course={course} />
          </div>
        ))}
    </div>
  );
}

export default CoursesList;