export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <p className="mb-2 text-sm font-medium text-emerald-600">HMRAY</p>
        <h1 className="mb-4 text-3xl font-bold tracking-tight">HMRAY Admin</h1>
        <p className="text-slate-600">
          پنل مدیریت سفارشات — نسخه اولیه
        </p>
        <div className="mt-8 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-500">
          وضعیت: آماده توسعه
        </div>
      </div>
    </main>
  );
}
