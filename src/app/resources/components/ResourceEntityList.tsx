import type { ReactNode } from 'react';

export type ResourceEntityListItem = {
  _id: string;
  primary: string;
  trailing?: ReactNode;
};

type ResourceEntityListProps = {
  title: string;
  addLabel: string;
  items: ResourceEntityListItem[];
  selectedId: string | null;
  isCreating: boolean;
  onAdd: () => void;
  onSelect: (id: string) => void;
};

export default function ResourceEntityList({
  title,
  addLabel,
  items,
  selectedId,
  isCreating,
  onAdd,
  onSelect,
}: ResourceEntityListProps) {
  const sorted = [...items].sort((a, b) =>
    a.primary.localeCompare(b.primary, undefined, { sensitivity: 'base' }),
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {addLabel}
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {sorted.length === 0 && !isCreating ? (
          <p className="text-sm text-gray-500">
            No {title.toLowerCase()} yet. Use &quot;{addLabel}&quot; to create one.
          </p>
        ) : (
          sorted.map((item) => {
            const isSelected = !isCreating && selectedId === item._id;
            return (
              <button
                key={item._id}
                type="button"
                onClick={() => onSelect(item._id)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? 'border-indigo-200 bg-white text-gray-900 shadow-sm'
                    : 'border-transparent bg-transparent text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="min-w-0 truncate font-medium">{item.primary}</span>
                {item.trailing != null ? (
                  <span className="shrink-0">{item.trailing}</span>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
