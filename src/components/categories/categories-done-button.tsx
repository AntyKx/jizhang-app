"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// router.back() rather than a fixed href — /categories is reached from more
// than one place (the home page's "管理分類" link, /more's own menu), so
// "the page I actually came from" is only ever known via history, not a
// hardcoded destination.
export function CategoriesDoneButton() {
  const router = useRouter();

  return (
    <Button variant="outline" onClick={() => router.back()}>
      完成
    </Button>
  );
}
