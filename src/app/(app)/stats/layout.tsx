import { PageHeader } from "@/components/page-header";
export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="統計" />
      {children}
    </div>
  );
}
