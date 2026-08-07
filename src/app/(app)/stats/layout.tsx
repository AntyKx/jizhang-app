export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">統計</h1>
      {children}
    </div>
  );
}
