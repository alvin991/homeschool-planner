'use client';

import CalendarGrid from "./CalendarGrid";
import MonthTopBar from "./MonthTopBar";

export default function MonthView() {
    return (
        <>
            <div className="flex-1 min-h-0 flex flex-col">
                <MonthTopBar />
                <CalendarGrid />
            </div>
        </>
    );
}