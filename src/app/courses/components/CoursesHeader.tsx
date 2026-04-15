import { useEffect, useState } from 'react';

type CoursesHeaderProps = {
  onSearchChange: (query: string) => void;
  sortAscending: boolean;
  onToggleSort: () => void;
};

function CoursesHeader({
  onSearchChange,
  sortAscending,
  onToggleSort,
}: CoursesHeaderProps) {
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, onSearchChange]);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white p-3">
      <div className="relative min-w-[14rem] flex-1">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search courses / publishers / subjects / grades..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        {searchInput ? (
          <button
            type="button"
            onClick={() => setSearchInput('')}
            className="absolute inset-y-0 right-2 my-auto h-7 w-7 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Clear search"
            title="Clear search"
          >
            ×
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onToggleSort}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50"
        title="Toggle sort order"
      >
        Sort {sortAscending ? 'A-Z' : 'Z-A'}
      </button>
    </div>
  );
}

export default CoursesHeader;