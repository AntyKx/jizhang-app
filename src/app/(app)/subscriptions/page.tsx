import { addDays, addMonths, addWeeks, addYears } from "date-fns";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, recurringRules } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { listAccounts } from "@/lib/account";
import { CreateRuleDialog } from "@/components/subscriptions/create-rule-dialog";
import { RuleRow } from "@/components/subscriptions/rule-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StaggerList } from "@/components/motion/stagger-list";
import { CountUpNumber } from "@/components/motion/count-up-number";
import { BearIllustration } from "@/components/bear-illustration";
import { getTodayInTaipei } from "@/lib/date";

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

  // Despite the old variable name, this was never actually filtered to
  // expense-only — a recurring rule can be income or expense (see the
  // type Select in create/edit-rule-dialog), so both need to be fetched.
  // Which subset is offered for a given rule is filtered client-side by
  // the dialogs based on the currently selected type, same pattern as
  // edit-transaction-dialog.tsx.
  const [allCategories, accountRows, rules] = await Promise.all([
    db
      .select({ id: categories.id, name: categories.name, icon: categories.icon, color: categories.color, type: categories.type })
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(categories.sortOrder),
    listAccounts(userId),
    db
      .select()
      .from(recurringRules)
      .where(and(eq(recurringRules.userId, userId), eq(recurringRules.isActive, true))),
  ]);

  // Same exclusion as every other "pick an account to post against" surface
  // (see getQuickAddContext) — a fixed-deposit-style account isn't a valid
  // destination for a recurring bill either.
  const pickableAccounts = accountRows
    .filter((a) => !a.excludeFromNetWorth)
    .map((a) => ({ id: a.id, name: a.name, type: a.type }));

  const rangeEnd = addDays(getTodayInTaipei(), 30);

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
        <CreateRuleDialog categories={allCategories} accounts={pickableAccounts} />
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
              <CountUpNumber value={projectedNet} prefix={projectedNet >= 0 ? "+" : ""} />
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
            <CountUpNumber value={monthlySubscriptionCost} />
          </CardContent>
        </Card>
      </div>

      {rules.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-6 text-center shadow-md shadow-foreground/10">
          <BearIllustration name="empty" size={96} />
          <p className="text-muted-foreground text-sm">還沒有設定任何定期收支項目。</p>
        </div>
      ) : (
        <StaggerList className="flex flex-col divide-y overflow-hidden rounded-2xl border bg-card">
          {rules.map((r) => (
            <RuleRow
              key={r.id}
              rule={{
                id: r.id,
                name: r.name,
                amount: r.amount,
                type: r.type === "transfer" ? "expense" : r.type,
                paymentMethod: r.paymentMethod,
                accountId: r.accountId,
                frequency: r.frequency,
                interval: r.interval,
                nextOccurrence: r.nextOccurrence,
                categoryId: r.categoryId,
                isSubscription: r.isSubscription,
              }}
              categories={allCategories}
              accounts={pickableAccounts}
              showAccount={pickableAccounts.length > 1}
            />
          ))}
        </StaggerList>
      )}
    </div>
  );
}
