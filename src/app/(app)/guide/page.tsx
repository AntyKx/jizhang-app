import { BackLink } from "@/components/back-link";
import { GuideBody } from "@/components/guide/guide-body";

export const metadata = {
  title: "使用說明 - 小熊記帳本",
};

export default function GuidePage() {
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/more" label="更多功能" />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">使用說明</h1>
        <p className="text-sm text-muted-foreground">點開需要的部分就好</p>
      </div>

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
