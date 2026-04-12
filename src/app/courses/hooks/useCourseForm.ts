'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import apolloClient from '@/utils/apolloClient';
import {
  CREATE_COURSE,
  GET_COURSE_FORM_META,
  GET_COURSES,
  UPDATE_COURSE,
} from '../api/course.graphql';
import type { CourseType, PublisherType, SubjectType } from '../types';
import { useCoursesUI } from '../CoursesUIContext';

export type CourseFormMetaData = {
  subjects: SubjectType[];
  publishers: PublisherType[];
};

export type CourseFieldErrorKey =
  | 'title'
  | 'publisherName'
  | 'grade'
  | 'subjectName'
  | 'subjectColor';

export function useCourseForm(course?: CourseType | null) {
  const { registerCourseFlush } = useCoursesUI();

  const [title, setTitle] = useState(course?.title ?? '');
  const [publisherName, setPublisherName] = useState(course?.publisher?.name ?? '');
  const [grade, setGrade] = useState(course?.grade ?? '');
  const [subjectName, setSubjectName] = useState(course?.subject?.name ?? '');
  const [subjectColor, setSubjectColor] = useState(course?.subject?.color ?? '');
  const [editMode, setEditMode] = useState<boolean>(false);
  const [courseFieldErrors, setCourseFieldErrors] = useState<
    Partial<Record<CourseFieldErrorKey, boolean>>
  >({});

  const { data: metaData, loading: metaLoading } = useQuery<CourseFormMetaData>(
    GET_COURSE_FORM_META,
    {
      client: apolloClient,
      fetchPolicy: 'cache-first',
    },
  );

  const [createCourse] = useMutation(CREATE_COURSE, {
    client: apolloClient,
    refetchQueries: [{ query: GET_COURSES }],
  });

  const [updateCourse] = useMutation(UPDATE_COURSE, {
    client: apolloClient,
    refetchQueries: [{ query: GET_COURSES }],
  });

  const handleSubjectSelect = (name: string) => {
    setSubjectName(name);
    if (!name.trim()) {
      setSubjectColor('');
      return;
    }
    const subject = metaData?.subjects.find((s) => s.name === name);
    if (subject) {
      setSubjectColor(subject.color);
      return;
    }
    if (course?.subject?.name === name) {
      setSubjectColor(course.subject.color ?? '');
      return;
    }
    setSubjectColor('');
  };

  /**
   * Mandatory: title, publisher, grade, subject (name + color so saves match GraphQL input).
   */
  const validateAndHighlight = useCallback((): boolean => {
    const next: Partial<Record<CourseFieldErrorKey, boolean>> = {};
    if (!title.trim()) next.title = true;
    if (!publisherName.trim()) next.publisherName = true;
    if (!grade.trim()) next.grade = true;
    if (!subjectName.trim()) {
      next.subjectName = true;
      next.subjectColor = true;
    } else if (!subjectColor.trim()) {
      next.subjectColor = true;
    }
    setCourseFieldErrors(next);
    return Object.keys(next).length === 0;
  }, [title, publisherName, grade, subjectName, subjectColor]);

  const persistCourse = useCallback(async (): Promise<boolean> => {
    const input = {
      title: title.trim(),
      grade: grade.trim(),
      publisherName: publisherName.trim(),
      subjectName: subjectName.trim(),
      subjectColor: subjectColor.trim(),
    };
    try {
      if (course?._id) {
        await updateCourse({ variables: { id: course._id, input } });
      } else {
        await createCourse({ variables: { input } });
      }
      setCourseFieldErrors({});
      setEditMode(false);
      return true;
    } catch (err) {
      console.error('Failed to save course', err);
      return false;
    }
  }, [
    title,
    grade,
    publisherName,
    subjectName,
    subjectColor,
    course?._id,
    updateCourse,
    createCourse,
  ]);

  const flushCourseChanges = useCallback(async (): Promise<boolean> => {
    if (!editMode) {
      setCourseFieldErrors({});
      return true;
    }
    if (!validateAndHighlight()) return false;
    return persistCourse();
  }, [editMode, validateAndHighlight, persistCourse]);

  useLayoutEffect(() => {
    registerCourseFlush(flushCourseChanges);
    return () => registerCourseFlush(null);
  }, [registerCourseFlush, flushCourseChanges]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAndHighlight()) return;
    await persistCourse(); // errors logged inside persistCourse; stay in edit on failure
  };

  const handleCancel = useCallback(() => {
    setTitle(course?.title ?? '');
    setPublisherName(course?.publisher?.name ?? '');
    setGrade(course?.grade ?? '');
    setSubjectName(course?.subject?.name ?? '');
    setSubjectColor(course?.subject?.color ?? '');
    setCourseFieldErrors({});
    setEditMode(false);
  }, [course]);

  const clearFieldError = useCallback((key: CourseFieldErrorKey) => {
    setCourseFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // Re-sync fields only when switching courses. Listing course.title etc. would reset the form on every refetch and wipe view-mode state.
  useEffect(() => {
    setTitle(course?.title ?? '');
    setPublisherName(course?.publisher?.name ?? '');
    setGrade(course?.grade ?? '');
    setSubjectName(course?.subject?.name ?? '');
    setSubjectColor(course?.subject?.color ?? '');
    setCourseFieldErrors({});
    setEditMode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: course?._id only
  }, [course?._id]);

  return {
    title,
    setTitle,
    publisherName,
    setPublisherName,
    grade,
    setGrade,
    subjectName,
    subjectColor,
    setSubjectColor,
    editMode,
    setEditMode,
    courseFieldErrors,
    clearFieldError,
    metaData,
    metaLoading,
    handleSubjectSelect,
    handleSubmit,
    handleCancel,
  };
}
