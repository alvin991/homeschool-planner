export default function ItemMenu() {
  return (
    <div className="flex justify-end gap-2 p-2 border rounded bg-white shadow-sm">
        <div className="flex">
            <button className="px-3 py-1 text-2xl text-white rounded hover:bg-blue-600 transition">⬆️</button>
            <button className="px-3 py-1 text-2xl text-white rounded hover:bg-blue-600 transition">⬇️</button>
            <button className="px-3 py-1 text-2xl text-white rounded hover:bg-blue-600 transition">📁</button>
            <button className="px-3 py-1 text-2xl text-white rounded hover:bg-blue-600 transition">🗑️</button>
            <button className="px-3 py-1 text-2xl text-white rounded hover:bg-blue-600 transition">❌</button>
        </div>
    </div>
  )
}
