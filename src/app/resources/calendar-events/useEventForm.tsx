import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_STUDENTS, type GetStudentsData } from '../api/students.graphql';
import type { CalendarEventRow } from '../api/calendarEvents.graphql';
import apolloClient from '@/utils/apolloClient';

export function useEventForm() {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: studentsData } = useQuery<GetStudentsData>(GET_STUDENTS, {
    client: apolloClient,
  });
  const students = useMemo(() => studentsData?.students ?? [], [studentsData?.students]);

  const resetForm = () => {
    setTitle('');
    setStartDate('');
    setEndDate('');
    setStudentId(null);
    setFormError(null);
  };

  const loadRow = (row: CalendarEventRow) => {
    setTitle(row.title);
    setStartDate(row.start_date);
    setEndDate(row.end_date);
    setStudentId(row.student);
    setFormError(null);
  };

  const validate = (): string | null => {
    if (!title.trim()) return 'Name is required.';
    if (!startDate || !endDate) return 'Start date and end date are required.';
    if (endDate < startDate) return 'End date cannot be before start date.';
    return null;
  };

  return {
    title,
    setTitle,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    studentId,
    setStudentId,
    formError,
    setFormError,
    students,
    resetForm,
    loadRow,
    validate,
  };
}
