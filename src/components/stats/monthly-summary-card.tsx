"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MonthlySummaryCard() {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/monthly-summary", { method: "POST" });
      const data = await res.json();
      setSummary(data.summary ?? "目前無法產生摘要，請稍後再試。");
    } catch {
      setSummary("目前無法產生摘要，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>AI 本月摘要</CardTitle>
        <Button size="sm" variant="secondary" onClick={handleGenerate} disabled={loading}>
          {loading ? "分析中…" : summary ? "重新產生" : "產生摘要"}
        </Button>
      </CardHeader>
      {summary && (
        <CardContent>
          <p className="text-sm leading-relaxed">{summary}</p>
        </CardContent>
      )}
    </Card>
  );
}
