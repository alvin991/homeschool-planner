import type { CourseType, LessonType } from '../types';
import CourseForm from './CourseForm';
import ItemMenu from './ItemMenu';
import LessonForm from './LessonForm';
import { useCoursesUI } from '../CoursesUIContext';

export type CourseDetailsProps = {
  course: CourseType;
  lesson: LessonType | null;
  onBack: () => void;
};

function CourseDetails({ course, lesson, onBack }: CourseDetailsProps) {
  const { formMode } = useCoursesUI();

  return (
    <div>
      {/* <ItemMenu /> */}
      {formMode === 'course-edit' ? (
        <CourseForm course={course} />
      ) : (
        <LessonForm lesson={lesson} />
      )}
      <button className="btn btn-ghost border border-gray-300" onClick={onBack}>
        Back to Courses
      </button>
    </div>
  );
}

export default CourseDetails;
