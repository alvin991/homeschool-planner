import type { CourseType } from '../types';
import CourseForm from './CourseForm';
import ItemMenu from "./ItemMenu";
import LessonForm from "./LessonForm";

export type CourseDetailsProps = {
  course: CourseType;
  onBack: () => void;
};

function CourseDetails({ course, onBack }: CourseDetailsProps) {
  return (
    <div>
      {/* <h2 className="text-2xl font-bold mb-4">{course.title}</h2>
      <p>Publisher: {course.publisher.name}</p>
      <p>Grade: {course.grade}</p>
      <p>Subject: {course.subject.name}</p> */}
      {/* <ItemMenu /> */}
      {/* <LessonForm course={course} /> */}
      <CourseForm course={course} />
      <button onClick={onBack}>Back to Courses</button>
    </div>
  );
}

export default CourseDetails;