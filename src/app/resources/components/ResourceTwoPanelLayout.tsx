import type { ReactNode } from 'react';

type ResourceTwoPanelLayoutProps = {
  list: ReactNode;
  detail: ReactNode;
};

export default function ResourceTwoPanelLayout({
  list,
  detail,
}: ResourceTwoPanelLayoutProps) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1">
      <aside className="flex w-[26rem] shrink-0 flex-col border-r border-gray-200 bg-gray-50 p-4">
        {list}
      </aside>
      <main className="min-h-0 flex-1 overflow-y-auto p-6">{detail}</main>
    </div>
  );
}
