'use client';

import Link from 'next/link';

export default function NavigationMenu() {
  return (
    <nav className="flex items-center gap-1 text-sm text-gray-600">
    <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-800 font-medium">
      🏠 Home
    </Link>
    <Link href="/courses" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100">
      📋 Courses
    </Link>
    <Link href="/checklists" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100">
      ✅ Checklists
    </Link>
    <Link href="/sumsum" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100">
      👤 Sumsum
    </Link>
    <Link href="/kaka" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100">
      👤 Kaka
    </Link>
    <button className="w-8 h-8 ml-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-colors"></button>
  </nav>
  )
}
