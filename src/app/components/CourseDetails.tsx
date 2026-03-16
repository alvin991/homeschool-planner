import type { CourseType } from '@/app/courses/types';

type CourseDetailsProps = {
  course: CourseType;
  onBack: () => void;
};

function CourseDetails({ course, onBack }: CourseDetailsProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{course.title}</h2>
      <p>Publisher: {course.publisher.name}</p>
      <p>Grade: {course.grade}</p>
      <p>Subject: {course.subject.name}</p>
      <button onClick={onBack}>Back to Courses</button>
    </div>
  );
}

export default CourseDetails;