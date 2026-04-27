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
  const isNewCourse = formMode === 'course-new' || !course._id;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isNewCourse ? (
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-bold">Create your course details first</h1>
          <p className="mt-2 text-gray-500">
            After saving the course, you can add lessons and folders from the left panel.
          </p>
        </div>
      ) : !showLessonForm && !showFolderForm ? (
        <CourseEmpty courseId={course._id} />
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
