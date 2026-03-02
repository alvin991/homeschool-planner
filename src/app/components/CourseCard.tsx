import { CourseType } from "./CoursesContainer";
import styles from "./CourseCard.module.css";

const CourseCard: React.FC<{ course: CourseType }> = ({ course }) => {

  return (
    <div className={styles.card}>
      <div className={styles.flexCol}>
        <div>
          <div className={styles.title}>
            {course.title}
          </div>
          <div className={styles.publisher}>
            {course.publisher}
          </div>
        </div>
        <div className={styles.lessonInfoContainer}>
          <div className={styles.lessonInfoRow}>
            <span className={styles.publisher}>{course.lessons.length} lesson{course.lessons.length > 1 ? "s" : ""}</span>
            {(() => {
              // Use CSS variables instead of dynamic Tailwind classes.
              // Map a small set of semantic names to hex values.
              const colorKey = (course.subject.color || '').toLowerCase();
              const colorMap: Record<string, { bg: string; text: string; border: string }> = {
                red: { bg: '#fee2e2', text: '#7f1d1d', border: '#fecaca' },
                blue: { bg: '#dbeafe', text: '#1e3a8a', border: '#bfdbfe' },
                green: { bg: '#d1fae5', text: '#065f46', border: '#bbf7d0' },
                yellow: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
                purple: { bg: '#f3e8ff', text: '#5b21b6', border: '#e9d5ff' },
                pink: { bg: '#fce7f3', text: '#831843', border: '#fbcfe8' },
                indigo: { bg: '#e0e7ff', text: '#312e81', border: '#c7d2fe' },
                gray: { bg: '#f3f4f6', text: '#111827', border: '#e5e7eb' },
              };

              const chosen = colorMap[colorKey] ?? colorMap.gray;

              const style = {
                ['--badge-bg']: chosen.bg,
                ['--badge-text']: chosen.text,
                ['--badge-border']: chosen.border,
              } as React.CSSProperties & Record<string, string>;

              return (
                <div className={styles.subjectBadge} style={style}>
                  <span>{course.subject.name}</span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CourseCard;