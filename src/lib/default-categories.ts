export const defaultCategories: {
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
}[] = [
  // Same curated warm/muted family as category-color.ts's fallback palette
  // (consistent saturation/lightness, only hue varies) — these are hand-
  // assigned by meaning rather than hashed, since these categories are
  // shared system rows (userId IS NULL) every user sees.
  { name: "餐飲", type: "expense", icon: "utensils", color: "#C0512A" },
  { name: "交通", type: "expense", icon: "car", color: "#B8721A" },
  { name: "購物", type: "expense", icon: "shopping-bag", color: "#7A5B96" },
  { name: "娛樂", type: "expense", icon: "gamepad-2", color: "#3E7686" },
  { name: "居家", type: "expense", icon: "house", color: "#4B7A5E" },
  { name: "醫療", type: "expense", icon: "pill", color: "#B85C6E" },
  { name: "教育", type: "expense", icon: "book-open", color: "#4E5D82" },
  { name: "訂閱服務", type: "expense", icon: "repeat", color: "#6E5C8C" },
  { name: "其他支出", type: "expense", icon: "wallet", color: "#7A6A5C" },
  { name: "薪資", type: "income", icon: "banknote", color: "#3F7A52" },
  { name: "獎金", type: "income", icon: "gift", color: "#B98A2E" },
  { name: "投資收益", type: "income", icon: "trending-up", color: "#3A6690" },
  { name: "其他收入", type: "income", icon: "plus-circle", color: "#8A7256" },
];
