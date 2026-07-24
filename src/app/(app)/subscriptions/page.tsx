import { addDays, addMonths, addWeeks, addYears, format } from "date-fns";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { categories, recurringRules } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { CreateRuleDialog } from "@/components/subscriptions/create-rule-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function expandOccurrences(
  start: string,
  frequency: "daily" | "weekly" | "monthly" | "yearly",
  interval: number,
  rangeEndDate: Date,
) {
  const step = (d: Date) => {
    switch (frequency) {
      case "daily":
        return addDays(d, interval);
      case "weekly":
        return addWeeks(d, interval);
      case "monthly":
        return addMonths(d, interval);
      case "yearly":
        return addYears(d, interval);
    }
  };

  const occurrences: Date[] = [];
  let current = new Date(start);
  let guard = 0;
  while (current <= rangeEndDate && guard < 366) {
    occurrences.push(current);
    current = step(current);
    guard += 1;
  }
  return occurrences;
}

export default async function SubscriptionsPage() {
  const userId = await requireUserId();

  const [expenseCategories, rules] = await Promise.all([
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(or(isNull(categories.userId), eq(categories.userId, userId))),
    db
      .select()
      .from(recurringRules)
      .where(and(eq(recurringRules.userId, userId), eq(recurringRules.isActive, true))),
  ]);

  const rangeEnd = addDays(new Date(), 30);

  let projectedNet = 0;
  for (const r of rules) {
    const occurrences = expandOccurrences(r.nextOccurrence, r.frequency, r.interval, rangeEnd);
    const signedAmount = r.type === "income" ? Number(r.amount) : -Number(r.amount);
    projectedNet += signedAmount * occurrences.length;
  }

  const subscriptions = rules.filter((r) => r.isSubscription);
  const monthlySubscriptionCost = subscriptions.reduce((sum, r) => {
    const perMonth =
      r.frequency === "monthly"
        ? Number(r.amount) / r.interval
        : r.frequency === "yearly"
          ? Number(r.amount) / (12 * r.interval)
          : r.frequency === "weekly"
            ? (Number(r.amount) * 52) / (12 * r.interval)
            : (Number(r.amount) * 365) / (12 * r.interval);
    return sum + perMonth;
  }, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">訂閱 / 定期收支</h1>
        <CreateRuleDialog categories={expenseCategories} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-normal">
              未來 30 天預估淨變動
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span
              className={
                projectedNet >= 0
                  ? "text-2xl font-semibold text-emerald-600"
                  : "text-2xl font-semibold text-destructive"
              }
            >
              {projectedNet >= 0 ? "+" : ""}
              {Math.round(projectedNet).toLocaleString("zh-TW")}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-normal">
              每月訂閱總支出（估算）
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-destructive">
            {monthlySubscriptionCost.toLocaleString("zh-TW", { maximumFractionDigits: 0 })}
          </CardContent>
        </Card>
      </div>

      {rules.length === 0 ? (
        <p className="text-muted-foreground text-sm">還沒有設定任何定期收支項目。</p>
      ) : (
        <div className="flex flex-col divide-y rounded-2xl border bg-card">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.name}</span>
                {r.isSubscription && <Badge variant="outline">訂閱</Badge>}
              </div>
              <div className="text-right text-sm">
                <div className={r.type === "expense" ? "text-destructive" : "text-emerald-600"}>
                  {r.type === "expense" ? "-" : "+"}
                  {Number(r.amount).toLocaleString("zh-TW")}
                </div>
                <div className="text-muted-foreground text-xs">
                  下次 {format(new Date(r.nextOccurrence), "yyyy-MM-dd")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
