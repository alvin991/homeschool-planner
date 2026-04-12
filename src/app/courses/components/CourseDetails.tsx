import { useMemo } from 'react';
import type { CourseType } from '../types';
import { findLessonInTree } from '../courseTree';
import FolderForm from './FolderForm';
import LessonForm from './LessonForm';
import { useCoursesUI } from '../CoursesUIContext';
import CourseEmpty from './CourseEmpty';

export type CourseDetailsProps = {
  course: CourseType;
};

function CourseDetails({ course }: CourseDetailsProps) {
  const { formMode, selectedLessonTreeId } = useCoursesUI();

  const lessonForForm = useMemo(() => {
    if (formMode === 'lesson-new') return null;
    if (formMode !== 'lesson-edit' && formMode !== 'lesson-view') return null;
    if (!selectedLessonTreeId) return null;
    return findLessonInTree(course.lessonTree ?? [], selectedLessonTreeId);
  }, [course.lessonTree, formMode, selectedLessonTreeId]);

  const showLessonForm =
    formMode === 'lesson-new' || formMode === 'lesson-view' || formMode === 'lesson-edit';
  const showFolderForm =
    formMode === 'folder-new' || formMode === 'folder-view' || formMode === 'folder-edit';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!showLessonForm && !showFolderForm ? (
        <CourseEmpty />
      ) : (
        <>
          {showLessonForm ? (
            <LessonForm
              key={`${formMode}-${lessonForForm?._id ?? selectedLessonTreeId ?? 'none'}`}
              course={course}
              lesson={lessonForForm}
            />
          ) : (
            <FolderForm
              key={`${formMode}-${selectedLessonTreeId ?? 'new'}`}
              course={course}
            />
          )}
        </>
      )}
    </div>
  );
}

export default CourseDetails;
