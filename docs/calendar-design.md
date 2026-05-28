# Calendar Feature Design

## Overview

- URL: `/calendar?view=month|day&student=<id>`
- **Day view**: used by student — shows today's lesson(s)
- **Month view**: used by parent — shows projected schedule for all enrollments
- Backend returns frontend-ready JSON. Frontend only iterates and renders, no calculation logic.

---

## Enrollment Collection (Revised Schema)

```js
{
  _id, student, course, enrollment_date,
  start_date,
  end_date,                         // optional
  weekdays:   [Number],            // 0=Sun … 6=Sat. e.g. [1,3,5] = Mon/Wed/Fri
  lesson_rate: 0.25 | 0.5 | 1 | 2, // constrained to these 4 values only
  status:      'active' | 'completed' | 'dropped',
  suspension_periods: [{ start: Date, end: Date }],
  last_synced_at: Date,             // for out-of-sync detection vs course

  lessons: [                        // flat snapshot from course at enrollment time (folders excluded)
    { _id, title, content, note }
  ],

  scheduled_dates: [                // pre-computed school days (regenerated on settings change)
    "2026-01-05",
    "2026-01-12",
    ...
  ],

  lesson_occurrences: [             // embedded, one entry per scheduled day
    {
      sequence: Number,             // 1-based
      lessons: [
        { lesson_id, lesson_title, day_number, total_days }
        // day_number / total_days only meaningful when lesson_rate < 1
        // e.g. lesson_rate=0.5 → day_number=1, total_days=2
      ],
      status: 'pending' | 'completed' | 'skipped',
      completed_date: Date,         // null until done
    }
  ]
}
```

### Key formulas
- `total_occurrences = ceil(total_lessons / lesson_rate)`
- Last occurrence may have fewer lessons than `lesson_rate` (odd remainder) — still 1 full scheduled day
- Progress indicator "Day N of M" shown only when `lesson_rate < 1`

---

## Progress & Calendar Logic

- `scheduled_dates` = list of all school days for this enrollment (pre-computed, not lesson-date mapped)
- Lesson assignment computed at query time from completion count — no dates stored in `lesson_occurrences`
- **Today's lesson**: find first `pending` occurrence (sort by sequence) → show if today is in `scheduled_dates`
- **Month view for date D** (Nth scheduled occurrence from today): take the Nth `pending` occurrence in sequence
- **Postponement is implicit**: missed lesson stays `pending`, naturally appears next scheduled day. No cascade updates needed.
- **Skipped**: counts as progress (advances to next lesson), unlike pending (which postpones)
- **All occurrences completed/skipped**: enrollment `status` auto-updates to `completed`
- **Dropped or completed enrollment**: excluded from calendar entirely

---

## All Cases

### Enrollment Creation

1. Flatten `course.lessonTree` → `enrollment.lessons` (folders excluded)
2. Generate `lesson_occurrences` from `lessons` + `lesson_rate`
3. Generate `scheduled_dates` from `start_date`, `weekdays`, `suspension_periods`, bounded by `end_date` if set
4. Set `last_synced_at`

---

### Enrollment-Level Lesson Customization

5. **Modify lesson content** (title, notes, body) → allowed for both pending and completed lessons
6. **Reorder pending lessons** → allowed, regenerates pending `lesson_occurrences`
7. **Delete pending lessons** → allowed, regenerates pending `lesson_occurrences`
8. **Reorder or delete completed lessons** → NOT allowed (permanent history)

A lesson is **locked** (completed) when it has at least one completed `lesson_occurrence`. Backend adds `locked: true` in response — frontend just reads it.

---

### Enrollment Settings Changes → Regeneration Rules

9. **`lesson_rate` change** → keep completed occurrences as history, regenerate pending occurrences (count changes) + remaining `scheduled_dates`. If a lesson is partially completed (some occurrences done, some not) → counts as fully pending, all its occurrences must be completed.
10. **`weekdays` change** → `lesson_occurrences` untouched, regenerate `scheduled_dates` (same count, different actual dates)
11. **`suspension_periods` change** (add/edit/delete) → regenerate `scheduled_dates`, dates shift accordingly
12. **`start_date` change** → regenerate `scheduled_dates`
13. **`end_date` change** → regenerate `scheduled_dates`, truncate if needed. If lessons exceed available days, warn parent.

---

### Completion & Progress

14. **Mark `completed`** → sets `status`, `completed_date`. Advances progress to next pending occurrence.
15. **Mark `skipped`** → counts as progress, advances to next pending occurrence.
16. **All occurrences completed or skipped** → enrollment `status` auto-updates to `completed`, excluded from calendar.
17. **Enrollment `status` = `dropped`** → excluded from calendar entirely.

---

### Sync Function (Enrollment ← Course)

18. **Trigger detection** → `course.lessonTree_updated_at > enrollment.last_synced_at` shows "out of sync" indicator. Parent syncs explicitly per enrollment. Nothing ever auto-propagates.
19. **Sync content** → updates title/notes/body for all lessons in enrollment (including completed) from course.
20. **Sync structure, no completed lessons** → replace enrollment lessons entirely with course lessons, regenerate `lesson_occurrences`.
21. **Sync structure, some completed lessons** → completed lessons keep position, pending replaced by remaining course lessons in course order. Custom enrollment order is lost — warn parent.
22. **Sync adds new course lessons** → appended to pending lessons, regenerated into pending `lesson_occurrences`.
23. **Sync removes a pending lesson** → removed, pending `lesson_occurrences` regenerated.
24. **Sync removes a completed lesson** → kept forever in enrollment, never removed (permanent history).
25. **All lessons completed, then sync** → content sync still applies, structure sync has nothing to do.
26. **After sync** → update `enrollment.last_synced_at`.

---

### Day View Logic

27. Today not in `scheduled_dates` → show nothing
28. Today in `scheduled_dates` → find first `pending` occurrence sorted by sequence → show lesson(s)
29. `lesson_rate < 1` → show progress indicator "Day N of M"
30. No pending occurrences (course finished) → show nothing

---

### Edge Cases

31. `end_date` set, lessons exceed available days → `scheduled_dates` truncated, some `lesson_occurrences` have no date, warn parent
32. Suspension period covers an already-planned `scheduled_date` → regenerate `scheduled_dates`, affected dates shift forward
33. `lesson_rate` values constrained to `0.25`, `0.5`, `1`, `2` only
34. Last occurrence may have fewer lessons than `lesson_rate` (odd remainder) → still counts as 1 full scheduled day

---

## GraphQL Queries (Planned)

```graphql
dayView(studentId: ID!, date: String!): DayView
monthView(studentId: ID!, month: String!): MonthView
```

### Example Day View Response
```json
{
  "date": "2026-05-21",
  "enrollments": [
    {
      "course_title": "Math 103",
      "occurrence_id": "...",
      "status": "pending",
      "lessons": [
        {
          "lesson_title": "Fractions Part 1",
          "progress": "Day 1 of 2"
        }
      ]
    }
  ]
}
```

### Example Month View Response
```json
{
  "month": "2026-05",
  "days": [
    {
      "date": "2026-05-21",
      "enrollments": [
        {
          "course_title": "Math 103",
          "lesson_title": "Fractions Part 1",
          "progress": "Day 1 of 2",
          "status": "pending"
        }
      ]
    },
    {
      "date": "2026-05-22",
      "enrollments": []
    }
  ]
}
```
