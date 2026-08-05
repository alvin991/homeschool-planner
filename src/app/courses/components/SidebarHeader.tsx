type SidebarHeaderProps = {
    onClickAddLesson: () => void;
    onClickAddFolder: () => void;
    onClickAddBulkLessons: () => void;
}

export default function SidebarHeader({ onClickAddLesson, onClickAddFolder, onClickAddBulkLessons }: SidebarHeaderProps) {
  return (
    // <div className="flex align-center" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
    <div className="flex justify-between items-center border-b border-gray-300 gap-2 pb-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">📚️ Lessons</h1>
      </div>
      <div className="flex flex-1 gap-2 py-2">
        <button
            className="btn btn-ghost flex-1 border border-gray-300 bg-white active:scale-[0.98]"
            onClick={onClickAddLesson}>
          + Lesson
        </button>
        <button
            className="btn btn-ghost flex-1 border border-gray-300 bg-white active:scale-[0.98]"
            onClick={onClickAddFolder}>
          + Folder
        </button>
        <button
            className="btn btn-ghost flex-1 border border-gray-300 bg-white active:scale-[0.98]"
            onClick={onClickAddBulkLessons}>
          + Bulk Lessons
        </button>
      </div>
    </div>
  );
}
