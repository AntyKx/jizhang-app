"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BearIllustration } from "@/components/bear-illustration";
import type { StatsRangeUnit } from "@/lib/stats/range";

// `unit`/`date` mirror exactly what StatsRangeSwitcher put in the URL (see
// resolveStatsRange) — sent to /api/monthly-summary so the AI analyzes
// whatever period is currently selected instead of always "this month"
// regardless of what the rest of the page is showing.
export function MonthlySummaryCard({
  unit,
  dateParam,
  label,
}: {
  unit: StatsRangeUnit;
  dateParam: string;
  label: string;
}) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // A previously-generated summary is for the range that was selected when
  // it was generated — switching range makes it stale, so clear it back to
  // the empty state rather than leaving last period's text on screen under
  // a new label. Render-phase reset (same pattern as TransactionsList)
  // rather than an effect, so there's no stale-text flash before it clears.
  const [prevRangeKey, setPrevRangeKey] = useState(`${unit}:${dateParam}`);
  const rangeKey = `${unit}:${dateParam}`;
  if (rangeKey !== prevRangeKey) {
    setPrevRangeKey(rangeKey);
    setSummary(null);
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/monthly-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ range: unit, date: dateParam }),
      });
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
        <CardTitle>AI 摘要</CardTitle>
        <Button size="sm" variant="secondary" onClick={handleGenerate} disabled={loading}>
          {loading ? "分析中…" : summary ? "重新產生" : "產生摘要"}
        </Button>
      </CardHeader>
      {summary ? (
        <CardContent>
          <p className="text-sm leading-relaxed">{summary}</p>
        </CardContent>
      ) : (
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <BearIllustration name="ai-analysis" size={80} />
          <p className="text-sm text-muted-foreground">
            讓小熊幫你分析「{label}」的收支，點上面的「產生摘要」試試看！
          </p>
        </CardContent>
      )}
    </Card>
  );
}
