import { computeNetBalance } from "@/lib/shared-balance";
import type { SharedMonthlyPoint } from "@/lib/shared-trend";
import { BalanceCard } from "@/components/shared/balance-card";
import { AddSharedExpenseDialog } from "@/components/shared/add-expense-dialog";
import { SharedQuickAddFlow } from "@/components/shared/quick-add-flow";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { SharedExpenseRow, type SharedExpense } from "@/components/shared/expense-row";
import { SharedMonthlyTrendChart } from "@/components/shared/monthly-trend-chart";
import { PartnerNameDialog } from "@/components/shared/partner-name-dialog";
import { BearIllustration } from "@/components/bear-illustration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Category = { id: string; name: string; icon: string | null; color: string | null };

export function SharedLedgerDashboard({
  partnerName,
  expenses,
  categories,
  dateFrom,
  dateTo,
  monthlyTrend,
}: {
  partnerName: string;
  expenses: SharedExpense[];
  categories: Category[];
  dateFrom?: string;
  dateTo?: string;
  monthlyTrend: SharedMonthlyPoint[];
}) {
  const unsettled = expenses.filter((e) => !e.isSettled);
  const settled = expenses.filter((e) => e.isSettled);
  const netBalance = computeNetBalance(unsettled);
  const isFiltered = Boolean(dateFrom || dateTo);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">分帳本</h1>
        <PartnerNameDialog partnerName={partnerName} />
      </div>

      <DateRangeFilter from={dateFrom} to={dateTo} />

      <BalanceCard
        partnerName={partnerName}
        netBalance={netBalance}
        hasUnsettled={unsettled.length > 0}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />

      <SharedQuickAddFlow categories={categories} partnerName={partnerName} />

      <AddSharedExpenseDialog partnerName={partnerName} categories={categories} />

      {expenses.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-6 text-center shadow-md shadow-foreground/10">
          <BearIllustration name="multi-account" size={96} />
          <p className="text-sm text-muted-foreground">
            {isFiltered ? "這個區間沒有分帳支出。" : "還沒有分帳支出，新增第一筆吧！"}
          </p>
        </div>
      ) : (
        <>
          {unsettled.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                未結清（{unsettled.length}）
              </span>
              <div className="flex flex-col divide-y">
                {unsettled.map((e) => (
                  <SharedExpenseRow key={e.id} expense={e} partnerName={partnerName} categories={categories} />
                ))}
              </div>
            </div>
          )}
          {settled.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                已結清（{settled.length}）
              </span>
              <div className="flex flex-col divide-y opacity-70">
                {settled.map((e) => (
                  <SharedExpenseRow key={e.id} expense={e} partnerName={partnerName} categories={categories} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">近 6 個月分帳支出</CardTitle>
        </CardHeader>
        <CardContent>
          <SharedMonthlyTrendChart data={monthlyTrend} partnerName={partnerName} />
        </CardContent>
      </Card>
    </div>
  );
}
