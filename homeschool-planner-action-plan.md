# Homeschool Planner Student UI - Action Plan
## Strategic AI Approach + Daily Milestones

**Timeline:** End of April (realistic: 2-3 weeks)  
**Daily capacity:** 4 hours focused development  
**Goal:** Show your wife working progress weekly, full feature by end of April

---

## Current State
- Feature 1 (Course/Lesson creation): ~90% done ✅
- Feature 2 (Manual enrollment): Basic DB schema needed
- Feature 3 (Student UI): 0% — **THIS IS YOUR FOCUS**

---

## What Needs to Be Built

### Feature 2 Update (enrollment with schedule)
- Add `enrollment` table/collection linking Student → Course
- Store: `studentId`, `courseId`, `scheduledDays` (array: [1,2,3] = Mon/Tue/Wed), `startDate`, `endDate`
- GraphQL mutation: `enrollStudentToCourse(studentId, courseId, scheduledDays, startDate, endDate)`

### Feature 3 (Student UI - Daily View)
- **Student entry point:** `/student?studentId=xxx` (simple URL param, no auth for now)
- **Dashboard:** Show today's lessons based on enrollment schedule
- **Lesson detail:** Click lesson → see tasks → mark tasks complete
- **Task completion:** Persist to DB when marked complete

---

## Tech Approach: Strategic AI Use

### What to Ask AI For:
1. Full student dashboard component (lists today's lessons)
2. Lesson detail component (shows tasks)
3. Task completion mutation + UI
4. MongoDB schema updates
5. GraphQL mutations/queries for the above

### What You'll Do:
1. Understand the generated code (ask "why this approach?")
2. Test it thoroughly (forces you to understand edge cases)
3. Refactor/tweak as needed
4. Document decisions in README
5. In interviews: "I used AI to generate this, here's how I understood it and what I'd do differently"

---

## Week-by-Week Breakdown

### Week 1 (Days 1-5): Foundation + Schema
**Daily capacity: 4 hours**

**Day 1 (Today):**
- [ ] Call family doctor (do this first thing - not in the 4 hours)
- [ ] Create Student & Enrollment MongoDB schemas
- [ ] Ask AI: "Generate MongoDB Mongoose schemas for Student and Enrollment collections with these fields: [list fields]"
- [ ] Understand the schema, make sure it connects to your existing Course model
- [ ] Test: can you manually create a student and enrollment in MongoDB?
- **Check:** Schemas working in DB ✅
- **Show your wife:** Schema is ready, we're building the student interface next

**Day 2:**
- [ ] Create GraphQL types for Student, Enrollment
- [ ] Ask AI: "Create Apollo GraphQL type definitions and resolvers for Student and Enrollment"
- [ ] Understand the resolvers - why this approach to fetching data?
- [ ] Test: can you query students and enrollments in Apollo Studio?
- **Check:** GraphQL queries working ✅

**Day 3:**
- [ ] Enrollment mutation to assign course to student
- [ ] Ask AI: "Create GraphQL mutation enrollStudentToCourse that takes studentId, courseId, scheduledDays array, startDate, endDate"
- [ ] Understand: how does it validate? What happens if student already enrolled?
- [ ] Test: manually enroll your daughter in a course via Apollo Studio
- **Check:** Enrollment working ✅

**Day 4:**
- [ ] Calculation logic: given today's date + enrollment.scheduledDays, which lessons should show?
- [ ] Ask AI: "Write a utility function that takes an enrollment object and returns lessons for today based on scheduledDays and date range"
- [ ] Understand: edge cases (before start date? after end date? wrong day of week?)
- [ ] Test: verify logic with different dates
- **Check:** Lesson calculation working ✅

**Day 5:**
- [ ] GraphQL query to get today's lessons for a student
- [ ] Ask AI: "Create a GraphQL query `getTodayLessons(studentId)` that returns lessons scheduled for today"
- [ ] Understand: how does it use the utility function? Query structure?
- [ ] Test: query returns correct lessons
- **Check:** Query working ✅
- **Show your wife:** Backend is ready, now we build the student app UI

---

### Week 2 (Days 6-10): Student UI Components

**Day 6:**
- [ ] Student dashboard component (daily view)
- [ ] Ask AI: "Create a Next.js React component that displays today's lessons for a student. Use the getTodayLessons query. Show lesson title, description, and task count. Use Tailwind CSS."
- [ ] Understand: component structure, how it fetches data, why this layout?
- [ ] Test: does it display lessons correctly?
- **Check:** Dashboard rendering ✅
- **Show your wife:** Here's what your daughter will see! (send screenshot)

**Day 7:**
- [ ] Lesson detail component (click lesson → see tasks)
- [ ] Ask AI: "Create a component that shows lesson details: title, description, tasks list. User can click a task to mark it complete. Use mutation to save to DB."
- [ ] Understand: how does the mutation work? What happens on success?
- [ ] Test: click through, mark tasks, verify DB updates
- **Check:** Lesson detail working ✅

**Day 8:**
- [ ] Task completion UI + mutation
- [ ] Ask AI: "Create a GraphQL mutation markTaskComplete(taskId, studentId) that marks a task complete. Add optimistic UI feedback."
- [ ] Understand: optimistic updates, error handling, what if task already complete?
- [ ] Test: mark multiple tasks, see UI update, verify DB
- **Check:** Task completion working ✅

**Day 9:**
- [ ] Connect dashboard → lesson detail flow
- [ ] Click lesson on dashboard → navigates to detail view with that lesson
- [ ] Ask AI if you get stuck: "How do I pass lessonId to the detail component in Next.js?"
- [ ] Test: full flow — dashboard → click lesson → see tasks → mark complete
- **Check:** Full feature working ✅
- **Show your wife:** Full student flow working! Test it on iPad

**Day 10:**
- [ ] Polish + testing
- [ ] Make sure dates/times display correctly
- [ ] Test edge cases: what if no lessons today? What if past end date?
- [ ] Fix any bugs you find
- **Check:** Stable and ready for real use ✅

---

## Daily Routine Structure

**Morning (~2 hours):**
- Check emails
- Apply to 3-5 relevant jobs
- Update LinkedIn/GitHub if needed

**Afternoon (~4 hours):**
- Follow the homeschool planner daily milestone
- Focus time: build → test → understand

---

## Daily Tracking Template

Use this each day to measure progress:

```
**Day X - [Date]**

MORNING:
- [ ] Job hunting
  - Applications sent: ___
  - URLs/companies: [paste links]
  - Notes: Any good fits?

AFTERNOON (Homeschool Planner):
- [ ] Today's milestone: [what you're building]
  - Time spent: __ hours
  - AI used?: (Yes/No - what for?)
  - Understood the code?: (Yes/Mostly/No)
  - Working test?: (Yes/No)
  - Blocker?: (anything stuck?)

PORTFOLIO:
- [ ] GitHub commit pushed?: (Yes/No)
- [ ] README updated?: (Yes/No)

**Overall Progress:** [% complete]
**Wife check-in:** (did you show her progress?)
**Notes:** What went smooth? What was tricky?
```

---

## AI Prompts - Ready to Use

### Prompt 1: MongoDB Schemas
```
Create MongoDB Mongoose schemas for a homeschool planner. I need:

1. Student schema with: studentId (unique), name, createdAt
2. Enrollment schema with: enrollmentId (unique), studentId (ref), courseId (ref), 
   scheduledDays (array of 0-6 for Sun-Sat), startDate, endDate, createdAt

Use TypeScript types. Export both schemas and their TypeScript interfaces.
```

### Prompt 2: GraphQL Types & Resolvers
```
Create Apollo GraphQL type definitions for Student and Enrollment.
Include queries: getStudent(id), listStudents, getEnrollment(id)

Use the Mongoose schemas I just created. Write the resolvers too.
Stack: Apollo Server, Node.js, MongoDB/Mongoose, TypeScript.
```

### Prompt 3: Enrollment Mutation
```
Create a GraphQL mutation enrollStudentToCourse that:
- Takes: studentId, courseId, scheduledDays (array), startDate, endDate
- Creates an Enrollment document
- Returns the created enrollment
- Handles errors: student not found, course not found, already enrolled

Use Apollo/Mongoose. Include error messages.
```

### Prompt 4: Lesson Calculation Utility
```
Write a TypeScript utility function:

Function: getLessonsForToday(enrollment: Enrollment, allLessons: Lesson[]): Lesson[]

Logic:
- Today's date must be between enrollment.startDate and enrollment.endDate
- Today's day of week must be in enrollment.scheduledDays
- Return lessons where lesson.index % (total lessons in course) matches the expected lesson for today
- If today is not a scheduled day, return empty array

Include TypeScript types and edge case handling (before start date, after end date).
```

### Prompt 5: GraphQL Query - Today's Lessons
```
Create a GraphQL query getTodayLessons(studentId: String!): [Lesson]

Logic:
- Find all enrollments for this student
- For each enrollment, calculate which lessons should show today (use the utility function)
- Return combined list of lessons for today
- Include lesson title, description, taskCount

Use Apollo, Mongoose, TypeScript.
```

### Prompt 6: Student Dashboard Component
```
Create a Next.js React component (app router) for the student dashboard:

Props: studentId (from URL params)
Fetches: getTodayLessons query via Apollo Client
Displays: Today's lessons in a clean list
- Each lesson shows: title, description, task count
- Click lesson → navigates to /student/lesson/[lessonId]
- If no lessons, show friendly message "No lessons today"

Styling: Tailwind CSS, mobile-friendly (iPad/Chromebook)
```

### Prompt 7: Lesson Detail Component
```
Create a Next.js React component for lesson detail view:

Route: /student/lesson/[lessonId]
Fetches: lesson with tasks via GraphQL
Displays:
- Lesson title, description
- Task list with checkboxes
- Click checkbox → marks task complete (calls mutation)

Mutation: markTaskComplete(taskId, studentId)
UI: Optimistic updates (checkbox updates immediately)
Styling: Tailwind CSS, mobile-friendly
```

### Prompt 8: Mark Task Complete Mutation
```
Create a GraphQL mutation markTaskComplete(taskId: String!, studentId: String!): Task

Logic:
- Find the task
- Update task.completedBy = studentId, task.completedAt = now
- Return updated task
- Handle errors: task not found, already completed

Use Apollo, Mongoose. Include proper error messages.
```

---

## Speed Comparison: Old vs. New Approach

### Old Approach (Learn everything deeply yourself)
- Day 1-2: Figure out schema design
- Day 3-5: Manually write GraphQL types/resolvers
- Day 6-7: Write utility function, debug logic
- Day 8-12: Build React components
- Day 13-15: Testing, debugging
- **Total: ~3 weeks (15 days)**
- You understand every line ✅
- Your wife waits 3 weeks ❌
- Slower progress visibility ❌

### Strategic AI Approach (Understand + verify)
- Day 1-2: AI generates schema/GraphQL, you understand it (~4 hours each day)
- Day 3: AI generates utility function, you test it
- Day 4: Enrollment mutation + query, you verify
- Day 5-9: AI generates components, you test full flow, tweak as needed
- Day 10: Polish & bug fixes
- **Total: ~10 days (2 weeks)**
- You understand the code (you tested it thoroughly) ✅
- Your wife sees progress daily ✅
- Wife can test by mid-late April ✅
- You can show working features each week ✅

**Time saved: ~5 days = shows your wife working progress 1 week earlier**

---

## How to Stay Accountable

1. **Track daily** — fill out the tracking template each day
2. **Weekly check-in with wife** — show her a working piece (even if small)
3. **GitHub commits** — push daily so you have visible progress
4. **After each task** — test it works before moving to next
5. **When stuck** — ask AI, but spend 20 mins understanding the answer before moving on

---

## Why This Works

✅ **Clear daily targets** — no vague "work on the app" days  
✅ **Job hunting stays consistent** — 3-5 applications daily keeps momentum  
✅ **Measurable progress** — you can track hours + features + apps sent  
✅ **Wife sees it coming together** — weekly demos keep her engaged  
✅ **Portfolio grows in real-time** — each feature you finish goes to GitHub  
✅ **You understand the code** — you're testing and verifying everything  
✅ **Interview ready** — "I used AI for speed, here's how I verified it worked"  
✅ **Done by end of April** — realistic timeline with 4 hours/day + consistent job hunt  

---

## Integration with Job Search

**Why this matters:** As you build the homeschool planner, you're creating portfolio evidence that employers want to see.

**Weekly portfolio updates (after each feature ships):**
- Push to GitHub with meaningful commits
- Update README with what you built and why
- Share link on LinkedIn: "Built student dashboard component for homeschool planner. Used strategic AI + verification. Here's how..."
- Use this in job applications: "Recently built X feature using modern stack (Next.js, GraphQL, MongoDB, Tailwind)"

**What this shows employers:**
- You ship working features ✅
- You understand AI tools + limitations ✅
- You verify code before shipping ✅
- You document your decisions ✅
- You learn from feedback ✅  

---

## Next Steps

1. **Today:**
   - [ ] Call family doctor (schedule appointment)
   - [ ] Show this plan to your wife — get her buy-in
   - [ ] Set up GitHub branch for this feature

2. **Tomorrow (Day 1):**
   - [ ] Start with Prompt 1 (MongoDB schemas)
   - [ ] Follow the daily breakdown
   - [ ] Fill out tracking template at end of day

3. **Each week:**
   - [ ] Show your wife working progress
   - [ ] Update your GitHub README with progress
   - [ ] Stay focused on the daily milestone, not the whole project

---

**You've got this. The key is: start small, show progress weekly, understand what AI generates.**
