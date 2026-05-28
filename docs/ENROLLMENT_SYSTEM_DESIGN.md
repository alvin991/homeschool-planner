# Homeschool Planner: Student Course Enrollment System Design

## Overview

This document outlines the complete design for the student course enrollment feature, including:
- Student-to-course mapping
- Lesson weekdays and completion rates
- Course versioning and upgrades
- Progress tracking by lesson ID
- Parent upgrade reminders

---

## 1. Core Enrollment Model

### Data Structure

```javascript
enrollments {
  id: string,                          // Unique enrollment ID
  student_id: string,                  // Foreign key to student
  course_id: string,                   // Foreign key to course
  course_version: number,              // Which version of course enrolled in
  
  // Lesson delivery settings
  weekdays: number[],                 // Weekdays: [0-6] or [1-7]
                                       // Example: [1, 3, 5] = Mon, Wed, Fri
  lesson_rate: {
    numerator: number,                 // Example: 1
    denominator: number,               // Example: 2 (means 1/2 per completion)
  },
  
  // Lesson sequence override
  lesson_sequence: string[] | null,    // Custom lesson order if swapped
                                       // null = use course's default
  
  // Progress tracking (BY LESSON ID, not position)
  completed_lesson_ids: Array<{
    lesson_id: string,
    completed_at: timestamp,
    version_at_completion: number,     // Which course version was active
  }>,
  lessons_completed: number,           // Denormalized count for quick lookup
  total_lessons: number,               // Calculated at enrollment
  
  // Metadata
  status: "Active" | "Paused" | "Completed" | "Dropped",
  enrollment_date: timestamp,
  
  // Version history
  version_upgrade_history: Array<{
    from: number,
    to: number,
    upgraded_at: timestamp,
    lessons_removed: string[],         // Lesson IDs no longer in course
    new_lessons_count: number,
  }>,
  
  // Dismissals
  dismissed_upgrade_reminders: number[], // Version numbers user said "don't remind me"
}
```

### Unique Constraints

```sql
UNIQUE(student_id, course_id, course_version)
-- Prevents duplicate enrollments, but allows same student on different versions
```

---

## 2. Enrollment Workflow (4 Steps)

### Step 1: Select Student
- Dropdown or searchable list from student database
- Shows: Student name, current enrollment count

### Step 2: Choose Course
- Dropdown or card grid of available courses
- Shows: Course title, lesson count, current version
- Only show courses not already enrolled in (prevent duplicate enrollments)

### Step 3: Set Lesson weekdays
- Checkboxes for each weekday (Mon–Sun)
- Stores selected days in `weekdays` array
- Example: User selects Mon, Wed, Fri → `[1, 3, 5]`
- Purpose: For calendar views, reminders, and progress expectations

### Step 4: Set Lesson Rate
- Radio buttons or dropdown for completion portion:
  - `1/1`: Complete 1 lesson per completion event (default)
  - `1/2`: Complete 1/2 lesson per completion event (need 2 events = 1 lesson)
  - `1/3`: Complete 1/3 lesson per completion event (need 3 events = 1 lesson)
  - Custom: Allow user to enter custom fraction

- Calculates `total_lessons`:
  ```
  total_lessons = course.lessons.length / lesson_rate
  
  Example:
    Course has 24 lessons
    Rate is 1/2
    total_lessons = 24 ÷ (1/2) = 24 × 2 = 48 completion events needed
  ```

---

## 3. Progress Tracking Strategy

### Why Track by Lesson ID, Not Position

**Problem with position-based tracking:**
- If course changes (reorder, add, remove lessons), progress becomes ambiguous
- Example: Alice completed position 2 (was Lesson C), later position 2 is Lesson B—confusion

**Solution: Always store lesson IDs in completion history:**

```javascript
// Store this:
completed_lesson_ids: [
  { lesson_id: "L1", completed_at: "2025-05-01", version_at_completion: 1 },
  { lesson_id: "L2", completed_at: "2025-05-02", version_at_completion: 1 },
  { lesson_id: "L3", completed_at: "2025-05-03", version_at_completion: 1 },
]

// NOT this:
lessons_completed: 3  // Which lessons? Position-based is fragile
```

### Calculating Progress

```javascript
function getProgress(enrollment) {
  return {
    completed: enrollment.lessons_completed,
    total: enrollment.total_lessons,
    percentage: (enrollment.lessons_completed / enrollment.total_lessons) * 100,
  };
}
```

### Getting Next Lesson

```javascript
function getNextLessonForStudent(enrollment, course) {
  // Use custom sequence if it exists (e.g., after swaps)
  const sequence = enrollment.lesson_sequence || course.lessons.map(l => l.id);
  
  // Find the next lesson not yet completed
  const nextIndex = enrollment.lessons_completed;
  const nextLessonId = sequence[nextIndex];
  
  return course.lessons.find(l => l.id === nextLessonId);
}
```

---

## 4. Course Versioning System

### What Versions Mean

- **At course level:** Each published version is a snapshot (v1, v2, v3...)
- **At enrollment level:** Each student is locked to the version they enrolled in

### Example Timeline

```
Jan 15, 2025: Publish Math 101 v1 (5 lessons)
  └─ Jan 20: Alice enrolls → locked to v1
  └─ Jan 25: Bob enrolls → locked to v1

Feb 10, 2025: Publish Math 101 v2 (6 lessons, reordered)
  └─ Feb 12: Carol enrolls → locked to v2 (latest)

Current state:
  Alice: v1, 3/5 done, can upgrade to v2 (optional)
  Bob:   v1, 1/5 done, can upgrade to v2 (optional)
  Carol: v2, 0/6 done, already on latest
```

### New Enrollment Always Gets Latest Version

```javascript
async function createEnrollment(studentId, courseId) {
  const course = await getCourse(courseId);
  
  return {
    student_id: studentId,
    course_id: courseId,
    course_version: course.latest_version,  // Always current
    completed_lesson_ids: [],
    lessons_completed: 0,
    total_lessons: course.lessons.length / lesson_rate,
    status: "Active",
    enrollment_date: new Date(),
  };
}
```

---

## 5. Upgrading to a Newer Version

### Upgrade Flow

```javascript
async function upgradeEnrollmentToNewVersion(enrollmentId, newVersion) {
  const enrollment = await getEnrollment(enrollmentId);
  const newCourse = await getCourse(enrollment.course_id, newVersion);
  
  // Get lessons the student completed
  const completedIds = enrollment.completed_lesson_ids.map(c => c.lesson_id);
  
  // Get lesson IDs in the new version
  const newLessonIds = newCourse.lessons.map(l => l.id);
  
  // Audit the change
  const lessonsKept = completedIds.filter(id => newLessonIds.includes(id));
  const lessonsRemoved = completedIds.filter(id => !newLessonIds.includes(id));
  const newLessonsAdded = newCourse.lessons.filter(l => !completedIds.includes(l.id));
  
  // Log the upgrade
  await logUpgrade(enrollmentId, {
    from: enrollment.course_version,
    to: newVersion,
    lessons_kept: lessonsKept.length,
    lessons_removed: lessonsRemoved,
    new_lessons_added: newLessonsAdded.length,
  });
  
  // Update enrollment
  await updateEnrollment(enrollmentId, {
    course_version: newVersion,
    lesson_sequence: null,  // Reset any custom overrides
    version_upgrade_history: [
      ...(enrollment.version_upgrade_history || []),
      {
        from: enrollment.course_version,
        to: newVersion,
        upgraded_at: new Date(),
        lessons_removed: lessonsRemoved,
        new_lessons_count: newLessonsAdded.length,
      }
    ]
  });
  
  return { status: "upgraded", summary: {...} };
}
```

### What Happens to History After Upgrade

| Scenario | What Happens | Student's Next Lesson |
|----------|--------------|----------------------|
| **New lesson inserted** | Completion history stays valid. New lesson added to "to-do". | Resumes where left off, encounters new lesson in order |
| **Lesson removed** | Completion history preserved (audit trail). Lesson never appears again. | Skipped; next available lesson |
| **Lesson reordered** | Completion tied to lesson ID, not position. Progress carries over. | Resumes from last completed lesson, even if position changed |

---

## 6. Swapping Lessons Within an Enrollment

### The Challenge

When a lesson needs to be swapped (e.g., Lesson 7 ↔ Lesson 8), should you:
- Option 1: Edit the course (affects all students) ❌
- Option 2: Edit just this enrollment ✅
- Option 3: Use course versioning (immutable template) ✅

### Recommended Approach: Enrollment-Level Override

Keep the course immutable. Store custom lesson sequence in the enrollment:

```javascript
enrollments {
  course_id: 1,
  lesson_sequence: null,  // null = use course's default
  
  // After swap:
  lesson_sequence: ["L1", "L2", "L3", "L4", "L5", "L8", "L7", ...],
}
```

### Swap Operation

```javascript
async function swapLessonsInEnrollment(enrollmentId, position1, position2) {
  const enrollment = await getEnrollment(enrollmentId);
  const course = await getCourse(enrollment.course_id, enrollment.course_version);
  
  // Initialize sequence if first override
  let sequence = enrollment.lesson_sequence || course.lessons.map(l => l.id);
  
  // Swap
  [sequence[position1], sequence[position2]] = [sequence[position2], sequence[position1]];
  
  // Save
  await updateEnrollment(enrollmentId, {
    lesson_sequence: sequence,
    lesson_sequence_created_at: new Date(),
    last_modified_by: currentUser.id,
  });
}
```

### When to Use Course Edit vs. Enrollment Override

| Situation | Use |
|-----------|-----|
| "I found a typo in Lesson 3 for all students" | Edit course, bump version |
| "This one student needs a different lesson order" | Enrollment override |
| "I want two variations of the course" | Create two separate courses |
| "Lesson 7 is broken, everyone should skip it" | Mark as disabled at course level |
| "A student just started, I haven't published yet" | Edit course (no enrollments affected) |

---

## 7. Parent Upgrade Reminders

### When to Show Reminders

Show upgrade reminder **only if ALL of these are true:**

1. Parent hasn't dismissed this reminder before
2. Student is early in course (≤30% done)
3. Upgrade is "significant" (not just typo fixes)
4. New version has been available ≥7 days (stability check)

### Implementation

```javascript
async function shouldShowUpgradeReminder(enrollment) {
  const course = await getCourse(enrollment.course_id);
  const newVersion = course.latest_version;
  
  // Check 1: Already on latest?
  if (enrollment.course_version >= newVersion) {
    return false;
  }
  
  // Check 2: Parent dismissed this reminder?
  if (enrollment.dismissed_upgrade_reminders?.includes(newVersion)) {
    return false;
  }
  
  // Check 3: Student too far in course?
  const progress = enrollment.lessons_completed / enrollment.total_lessons;
  if (progress > 0.3) {
    return false;
  }
  
  // Check 4: Is upgrade significant?
  const versionInfo = await getCourseVersion(enrollment.course_id, newVersion);
  if (versionInfo.significance !== "major") {
    return false;
  }
  
  // Check 5: Has version been out long enough?
  const daysSincePublished = Math.floor(
    (Date.now() - versionInfo.published_at) / (1000 * 60 * 60 * 24)
  );
  if (daysSincePublished < 7) {
    return false;
  }
  
  return true;
}
```

### Course Version Publishing

When publishing a new version, mark its significance:

```javascript
courses {
  id: 1,
  version: 2,
  published_at: timestamp,
  published_by: user_id,
  
  change_summary: {
    significance: "major" | "minor",
    // major: lesson reordering, restructuring, new lessons
    // minor: typo fixes, wording changes
    
    changes: [
      { type: "added_lesson", lesson_id: "L_new" },
      { type: "reordered", from: 3, to: 5 },
      { type: "removed_lesson", lesson_id: "L_old" },
    ],
    
    recommended_for_new_students: true,
  }
}
```

### Reminder UI

```
ℹ️ Heads up: A newer version (v2) available for Math 101

Changes in v2:
  • Lesson 3 reordered for better flow
  • New supplementary lesson added
  • More interactive examples

This version is recommended for students starting fresh.

[See what changed] [Upgrade now] [Remind me later] [Don't show again]
```

### Reminder Dismissal

```javascript
// "Remind me later" = ask again in 2 weeks
await updateEnrollment(enrollmentId, {
  dismissed_upgrade_until: Date.now() + (14 * 24 * 60 * 60 * 1000),
});

// "Don't show again for v2" = but ask about v3
await updateEnrollment(enrollmentId, {
  dismissed_upgrade_reminders: [
    ...(enrollment.dismissed_upgrade_reminders || []),
    newVersion
  ],
});
```

### What NOT to Do

❌ Show daily/weekly nags  
❌ Remind when student is >30% done (too disruptive)  
❌ Auto-upgrade without permission  
❌ Compare to other students ("Carol is on v2...")  

---

## 8. Summary: Key Design Principles

1. **Track by lesson ID, not position.** Protects against course restructuring.
2. **Lock each enrollment to a course version.** Prevents unexpected changes.
3. **Lesson sequence override at enrollment level.** Allows customization without breaking other students.
4. **Smart reminders.** Help parents discover improvements without nagging.
5. **Immutable courses, mutable enrollments.** Template stays clean, instances are flexible.

---

## 9. Database Schema (SQL-like pseudocode)

```sql
CREATE TABLE courses (
  id STRING PRIMARY KEY,
  title STRING,
  latest_version INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE course_versions (
  id STRING PRIMARY KEY,
  course_id STRING FOREIGN KEY,
  version INT,
  lessons ARRAY<STRUCT<
    id STRING,
    title STRING,
    content TEXT,
    order INT
  >>,
  change_summary STRUCT<
    significance STRING, -- "major" | "minor"
    changes ARRAY<...>,
    recommended_for_new_students BOOLEAN
  >,
  published_at TIMESTAMP,
  published_by STRING,
  UNIQUE(course_id, version)
);

CREATE TABLE enrollments (
  id STRING PRIMARY KEY,
  student_id STRING FOREIGN KEY,
  course_id STRING FOREIGN KEY,
  course_version INT FOREIGN KEY,
  
  weekdays ARRAY<INT>,
  lesson_rate STRUCT<numerator INT, denominator INT>,
  lesson_sequence ARRAY<STRING>,
  
  completed_lesson_ids ARRAY<STRUCT<
    lesson_id STRING,
    completed_at TIMESTAMP,
    version_at_completion INT
  >>,
  lessons_completed INT,
  total_lessons INT,
  
  status STRING,
  enrollment_date TIMESTAMP,
  
  version_upgrade_history ARRAY<STRUCT<...>>,
  dismissed_upgrade_reminders ARRAY<INT>,
  
  UNIQUE(student_id, course_id, course_version)
);

CREATE TABLE lesson_completions (
  id STRING PRIMARY KEY,
  enrollment_id STRING FOREIGN KEY,
  lesson_id STRING FOREIGN KEY,
  completed_at TIMESTAMP,
  notes TEXT -- for tracking why/observations
);
```

---

## 10. Implementation Checklist

- [ ] Design enrollment form UI (4 steps)
- [ ] Create enrollment database tables
- [ ] Implement progress calculation (lessons_completed / total_lessons)
- [ ] Build lesson sequence lookup (custom override or course default)
- [ ] Add swap lessons functionality to enrollment UI
- [ ] Implement course versioning system
- [ ] Build upgrade flow with lesson ID matching
- [ ] Create upgrade confirmation UI (shows what changes)
- [ ] Add smart reminder logic
- [ ] Test version upgrade scenarios (added, removed, reordered lessons)
- [ ] Build dismissal tracking for reminders
- [ ] Add lesson completion history view
- [ ] Create progress dashboard for parents/teachers

---

## 11. Example: Complete Enrollment Lifecycle

```
Date: Jan 20, 2025
Action: Enroll Alice in Math 101 v1

Enrollment created:
{
  student_id: "alice_123",
  course_id: "math101",
  course_version: 1,
  weekdays: [1, 3, 5],  // Mon, Wed, Fri
  lesson_rate: { numerator: 1, denominator: 2 },
  completed_lesson_ids: [],
  lessons_completed: 0,
  total_lessons: 24 / 0.5 = 48,  // 24 lessons, 1/2 rate = 48 events
  status: "Active",
  enrollment_date: 2025-01-20,
}

---

Date: Jan 22, 2025
Action: Alice completes her first lesson (Lesson L1)

Update:
{
  completed_lesson_ids: [
    { lesson_id: "L1", completed_at: 2025-01-22, version_at_completion: 1 }
  ],
  lessons_completed: 1,
}

Progress: 1/48 ≈ 2%

---

Date: Feb 10, 2025
Action: Teacher publishes Math 101 v2 (reordered 2 lessons, added 1 new)

Math 101 v2 details:
{
  version: 2,
  lessons: [L1, L2, L3_new, L4, L5, ...],  // L3 is new, L4 shifted
  significance: "major",
  ...
}

---

Date: Feb 11, 2025
Action: Alice's reminder logic checks

shouldShowUpgradeReminder(alice_enrollment):
  ✓ Not on latest (v1 < v2)
  ✓ Not dismissed
  ✓ Early in course (1/48 = 2% < 30%)
  ✓ Upgrade is "major"
  ✓ v2 published 1 day ago (< 7 days, but could show anyway)
  
Result: Might show reminder, or wait until day 7

---

Date: Feb 17, 2025
Action: Alice upgrades to v2

Upgrade logic:
  completedIds = ["L1"]
  v2LessonIds = ["L1", "L2", "L3_new", "L4", ...]
  
  Lessons kept: ["L1"] ✓ (still in v2)
  Lessons removed: [] (none)
  New lessons: ["L3_new", "L4", "L5", ...] (Alice hasn't done these)

Upgrade result:
{
  course_version: 2,
  lessons_completed: 1,  // Stays the same
  completed_lesson_ids: [
    { lesson_id: "L1", ..., version_at_completion: 1 }
  ],
  total_lessons: 25 / 0.5 = 50,  // New course has 25 lessons
  version_upgrade_history: [
    {
      from: 1,
      to: 2,
      upgraded_at: 2025-02-17,
      lessons_removed: [],
      new_lessons_count: 1,
    }
  ]
}

Progress: Now 1/50 ≈ 2% (same completion, more total lessons)

---

Date: March 1, 2025
Action: Teacher notices Lesson L4 and L5 should be swapped (enrollment-level override)

Swap operation on alice_enrollment:
  Current lesson_sequence: null (using v2 default: [L1, L2, L3_new, L4, L5, ...])
  After swap: [L1, L2, L3_new, L5, L4, ...]
  
  lesson_sequence is now saved to enrollment

---

Date: March 15, 2025
Action: Alice completes L2, then L3_new

Update:
{
  completed_lesson_ids: [
    { lesson_id: "L1", completed_at: 2025-01-22, version_at_completion: 1 },
    { lesson_id: "L2", completed_at: 2025-03-10, version_at_completion: 2 },
    { lesson_id: "L3_new", completed_at: 2025-03-15, version_at_completion: 2 },
  ],
  lessons_completed: 3,
}

Next lesson = position 3 in custom sequence = L5 (was originally position 4, but swapped)

Progress: 3/50 = 6%
```

---

## Notes for Implementation

- Use a background job to calculate and update `total_lessons` at enrollment time
- Consider caching the "next lesson" to avoid repeated lookups
- Use transaction-based updates for enrollment changes (progress + history)
- Log all version upgrades for audit trail
- Consider soft-delete for enrollments (status) rather than hard delete
- Test edge cases: upgrade with removed lessons, completed lessons changing position, etc.

