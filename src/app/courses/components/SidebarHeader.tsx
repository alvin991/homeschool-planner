type SidebarHeaderProps = {
    onClickAddLesson: () => void;
    onClickAddFolder: () => void;
}

export default function SidebarHeader({ onClickAddLesson, onClickAddFolder }: SidebarHeaderProps) {
  return (
    // <div className="flex align-center" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
    <div className="flex justify-between items-center border-b border-gray-300 gap-2 pb-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">📚️ Lessons</h1>
      </div>
      <div
        className="py-2"
        // style={{
        // //   marginBottom: '20px',
        //   padding: '10px',
        //   //   backgroundColor: '#f0f0f0',
        //   borderRadius: '4px',
        // }}
      >
        <button 
            className="btn btn-ghost border border-gray-300 bg-white active:scale-[0.98]"
            onClick={onClickAddFolder}>
          ➕ Add Folder
        </button>
        <button 
            className="btn btn-ghost border border-gray-300 bg-white active:scale-[0.98]"
            onClick={onClickAddLesson}>
          ➕ Add Lesson
        </button>
      </div>
    </div>
  );
}
