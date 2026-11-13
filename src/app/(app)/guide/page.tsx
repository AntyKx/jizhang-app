import { GuideBody } from "@/components/guide/guide-body";
import { PageHeader } from "@/components/page-header";

export const metadata = {
  title: "使用說明 - 小熊記帳本",
};

export default function GuidePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="使用說明" subtitle="點開需要的部分就好" back="/more" />

      <GuideBody />

      <p className="text-center text-xs text-muted-foreground">
        還有問題？
        <a href="mailto:antyk123@gmail.com" className="text-primary underline-offset-4 hover:underline">
          antyk123@gmail.com
        </a>
      </p>
    </div>
  );
}
