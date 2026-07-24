export const defaultCategories: {
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
}[] = [
  { name: "餐飲", type: "expense", icon: "🍔", color: "#eb6834" },
  { name: "交通", type: "expense", icon: "🚗", color: "#2a78d6" },
  { name: "購物", type: "expense", icon: "🛍️", color: "#e87ba4" },
  { name: "娛樂", type: "expense", icon: "🎮", color: "#4a3aa7" },
  { name: "居家", type: "expense", icon: "🏠", color: "#1baf7a" },
  { name: "醫療", type: "expense", icon: "💊", color: "#e34948" },
  { name: "教育", type: "expense", icon: "📚", color: "#2a78d6" },
  { name: "訂閱服務", type: "expense", icon: "🔁", color: "#4a3aa7" },
  { name: "其他支出", type: "expense", icon: "💸", color: "#898781" },
  { name: "薪資", type: "income", icon: "💰", color: "#1baf7a" },
  { name: "獎金", type: "income", icon: "🎁", color: "#eda100" },
  { name: "投資收益", type: "income", icon: "📈", color: "#1baf7a" },
  { name: "其他收入", type: "income", icon: "➕", color: "#eda100" },
];
