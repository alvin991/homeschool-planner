export default function CourseEmpty() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold">Select a lesson or folder</h1>
      <p className="mt-2 text-gray-500">Single-click to view</p>
      <p className="text-gray-500">Double-click to edit</p>
    </div>
  );
}
