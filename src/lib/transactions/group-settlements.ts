export type SettlementGroup<T> = {
  kind: "settlement-group";
  groupId: string;
  label: string;
  items: T[];
};

// Explicit type guard, not inline `"kind" in x` narrowing at call sites —
// TS doesn't reliably narrow a `T | SettlementGroup<T>` ternary when T is an
// intersection-shaped inferred type (as the query-result row types here
// are), even though the two are structurally distinguishable at runtime.
export function isSettlementGroup<T>(node: T | SettlementGroup<T>): node is SettlementGroup<T> {
  return typeof node === "object" && node !== null && "kind" in node && node.kind === "settlement-group";
}

// Collapses consecutive items sharing the same non-null linkedSharedExpenseId
// into one group node. Only CONSECUTIVE runs group — same split event's
// settlements are created together, same real day, so they're near-always
// adjacent once sorted; collecting matches regardless of position would
// raise unanswerable "where does the group node go" questions and can't
// survive keyset pagination splitting one group across two pages. Under a
// broken run, this just degrades to smaller/singleton groups — it never
// loses or misplaces a row.
//
// A type that can never be a settlement (e.g. TransferListItem) just
// declares linkedSharedExpenseId/settlementGroupLabel as always null —
// accurate (a transfer really can never be one), and it fails the
// truthiness check below exactly like a real unset value does, so callers
// with a mixed item union don't need to filter anything out first.
//
// Tracks the in-progress group in its own variable rather than narrowing
// `result`'s last element — T is fully generic and can itself carry an
// unrelated `kind` field (RegularItem/TransferListItem both do), so
// discriminating "is the last pushed node a group" via `"kind" in x` on a
// `T | SettlementGroup<T>` union isn't reliably narrowable at the type
// level even though it's safe at runtime (no real T ever has
// kind: "settlement-group").
export function groupSettlements<
  T extends { linkedSharedExpenseId: string | null; settlementGroupLabel: string | null },
>(items: T[]): (T | SettlementGroup<T>)[] {
  const result: (T | SettlementGroup<T>)[] = [];
  let openGroup: SettlementGroup<T> | null = null;

  for (const item of items) {
    if (item.linkedSharedExpenseId && openGroup && openGroup.groupId === item.linkedSharedExpenseId) {
      openGroup.items.push(item);
      continue;
    }
    if (item.linkedSharedExpenseId) {
      openGroup = {
        kind: "settlement-group",
        groupId: item.linkedSharedExpenseId,
        label: item.settlementGroupLabel ?? "分帳結算",
        items: [item],
      };
      result.push(openGroup);
    } else {
      openGroup = null;
      result.push(item);
    }
  }

  // A run of exactly 1 renders as a plain row, not a group shell.
  return result.flatMap((r) => (isSettlementGroup(r) && r.items.length === 1 ? r.items : [r]));
}
