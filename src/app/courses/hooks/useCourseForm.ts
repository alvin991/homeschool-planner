'use client';

import { useState } from 'react';
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

export function useCourseForm(course?: CourseType | null) {
  const { setSelectedCourse, setFormMode } = useCoursesUI();

  const [title, setTitle] = useState(course?.title ?? '');
  const [publisherName, setPublisherName] = useState(course?.publisher?.name ?? '');
  const [grade, setGrade] = useState(course?.grade ?? '');
  const [subjectName, setSubjectName] = useState(course?.subject?.name ?? '');
  const [subjectColor, setSubjectColor] = useState(course?.subject?.color ?? '');
  const [editMode, setEditMode] = useState<boolean>(false);

  const { data: metaData } = useQuery<CourseFormMetaData>(GET_COURSE_FORM_META, {
    client: apolloClient,
    fetchPolicy: 'cache-first',
  });

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
    const subject = metaData?.subjects.find((s) => s.name === name);
    if (subject) setSubjectColor(subject.color);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !title.trim() ||
      !publisherName.trim() ||
      !grade.trim() ||
      !subjectName.trim() ||
      !subjectColor.trim()
    ) {
      console.warn('Missing required fields');
      return;
    }

    try {
      const input = {
        title: title.trim(),
        grade: grade.trim(),
        publisherName: publisherName.trim(),
        subjectName: subjectName.trim(),
        subjectColor: subjectColor.trim(),
      };

      if (course?._id) {
        await updateCourse({ variables: { id: course._id, input } });
      } else {
        await createCourse({ variables: { input } });
      }

      // setSelectedCourse(null);
      // setFormMode('course-list');
      setEditMode(false);
    } catch (err) {
      console.error('Failed to save course', err);
    }
  };

  const handleCancel = () => {
    // setSelectedCourse(null);
    // setFormMode('course-list');
    setEditMode(false);
  };

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
    metaData,
    handleSubjectSelect,
    handleSubmit,
    handleCancel,
  };
}
