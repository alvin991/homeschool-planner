import { useMemo } from 'react';
import type { CourseType } from '../types';
import CourseForm from './CourseForm';
import ItemMenu from './ItemMenu';
import LessonForm from './LessonForm';
import { useCoursesUI } from '../CoursesUIContext';

export type CourseDetailsProps = {
  course: CourseType;
  onBack: () => void;
};

function CourseDetails({ course, onBack }: CourseDetailsProps) {
  const { formMode, selectedLessonTreeId } = useCoursesUI();

  const lessonForForm = useMemo(() => {
    if (formMode === 'lesson-new') return null;
    if (!selectedLessonTreeId) return null;
    return (
      course.lessons.find((l) => String(l._id) === selectedLessonTreeId) ?? null
    );
  }, [course.lessons, formMode, selectedLessonTreeId]);

  const showLessonForm = formMode === 'lesson-new' || formMode === 'lesson-edit';

  return (
    <div>
      {!showLessonForm ? (
        <CourseForm course={course} />
      ) : (
        <>
          <ItemMenu />
          <LessonForm
            key={`${formMode}-${lessonForForm?._id ?? selectedLessonTreeId ?? 'none'}`}
            lesson={lessonForForm}
          />
        </>
      )}
      <button className="btn btn-ghost border border-gray-300" onClick={onBack}>
        Back to Courses
      </button>
    </div>
  );
}

export default CourseDetails;
