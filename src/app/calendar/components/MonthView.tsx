'use client';
import apolloClient from '@/utils/apolloClient';
import { useQuery } from '@apollo/client/react';
import { GET_MONTH_VIEW } from '../api';
import { GetCalendarMonthViewData } from '../types';
import CalendarGrid from './CalendarGrid';
import MonthTopBar from './MonthTopBar';
import { useState } from 'react';
import { familyTodayAsDate } from '@/utils/dateUtils';

type MonthViewProps = {
  studentId: string;
  month: string;
};

export default function MonthView({ studentId, month: initialMonth }: MonthViewProps) {
  const [month, setMonth] = useState(initialMonth);
  const { data, loading, error } = useQuery<GetCalendarMonthViewData>(
    GET_MONTH_VIEW,
    {
      client: apolloClient,
      variables: { studentId, month },
      skip: !studentId || !month,
      fetchPolicy: 'cache-and-network'
    }
  );
  if (loading)
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  if (error)
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-500">Error: {error.message}</p>
      </div>
    );
  
  // TODO: midnight-rollover — add a timer that updates `today` at local midnight
  const today = familyTodayAsDate();
  const days = data?.calendarMonthView.days ?? [];

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <MonthTopBar month={month} onMonthChange={setMonth} today={today} />
      <CalendarGrid days={days} today={today} month={month} />
    </div>
  );
}
