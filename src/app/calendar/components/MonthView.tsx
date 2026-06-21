'use client';
import apolloClient from '@/utils/apolloClient';
import { useQuery } from '@apollo/client/react';
import { GET_MONTH_VIEW } from '../api';
import { GetCalendarMonthViewData } from '../types';
import CalendarGrid from './CalendarGrid';
import MonthTopBar from './MonthTopBar';

type MonthViewProps = {
  studentId: string;
  month: string;
};

export default function MonthView({ studentId, month }: MonthViewProps) {
  console.log('MonthView props:', { studentId, month });
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
  const returnMonth = data?.calendarMonthView.month ?? '';
  console.log('Fetched month from API:', returnMonth);
  const days = data?.calendarMonthView.days ?? [];
  console.log('Fetched days from API:', days);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <MonthTopBar />
      <CalendarGrid days={days} />
    </div>
  );
}
