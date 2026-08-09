export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-center border-b border-slate-200 bg-white shadow-sm">
        <div className="text-lg font-bold tracking-widest text-slate-900">HMRAY</div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
