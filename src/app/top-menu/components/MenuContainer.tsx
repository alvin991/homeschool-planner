'use client';

import Link from 'next/link';
import NavigationMenu from './NavigationMenu';

export default function MenuContainer() {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white">
      <Link href="/" className="flex items-center gap-2 font-semibold text-gray-800">
        Home School Planner
      </Link>
      <NavigationMenu />
    </header>
  );
}
