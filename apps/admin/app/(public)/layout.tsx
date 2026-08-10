export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f4]">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-center border-b border-[#1c2420]/08 bg-[#f4f6f4]/90 backdrop-blur-md">
        <div className="text-sm font-medium tracking-[0.18em] text-[#1c2420]">HMray Expo</div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
