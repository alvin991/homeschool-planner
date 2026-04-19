export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}
