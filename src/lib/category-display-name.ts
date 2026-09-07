// Purely a label shortener for tight grid tiles (the 分類 grid on /record) —
// never touches the stored category name, so renaming here doesn't cascade
// into transaction history, exports, or anywhere else the real name shows.
// Keyed by exact name; anything not listed just renders as-is (wraps up to
// 2 lines per the grid's own CSS).
const shortDisplayNames: Record<string, string> = {
  其他支出: "其他",
  其他收入: "其他",
  月度財務總結: "財務",
};

export function categoryDisplayName(name: string): string {
  return shortDisplayNames[name] ?? name;
}
