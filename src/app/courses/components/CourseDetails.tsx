import { useMemo } from 'react';
import type { CourseType } from '../types';
import { findLessonInTree } from '../courseTree';
import CourseForm from './CourseForm';
import FolderForm from './FolderForm';
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
    if (formMode !== 'lesson-edit') return null;
    if (!selectedLessonTreeId) return null;
    return findLessonInTree(course.lessonTree ?? [], selectedLessonTreeId);
  }, [course.lessonTree, formMode, selectedLessonTreeId]);

  const showLessonForm = formMode === 'lesson-new' || formMode === 'lesson-edit';
  const showFolderForm = formMode === 'folder-new' || formMode === 'folder-edit';

  return (
    <div>
      {!showLessonForm && !showFolderForm ? (
        <CourseForm course={course} />
      ) : (
        <>
          {/* <ItemMenu /> */}
          {showLessonForm ? (
            <LessonForm
              key={`${formMode}-${lessonForForm?._id ?? selectedLessonTreeId ?? 'none'}`}
              course={course}
              lesson={lessonForForm}
            />
          ) : (
            <FolderForm
              key={`${formMode}-${selectedLessonTreeId ?? 'new'}`}
            />
          )}
        </>
      )}
      <button className="btn btn-ghost border border-gray-300" onClick={onBack}>
        Back to Courses
      </button>
    </div>
  );
}

export default CourseDetails;
