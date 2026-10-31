// Appended right after "可用分類清單" in every AI parsing prompt. Without it
// the model filed snacks ("哈利熊蟲蟲軟糖") under 購物 — it reads a bought
// item as shopping — when the user's list had a food category for it.
export const CATEGORY_HINT =
  "分類判斷原則：吃的、喝的（正餐、零食、糖果、餅乾、飲料、咖啡、手搖飲）優先選清單裡的餐飲類分類（例如餐飲、零食、飲料、點心；清單裡有更細的就選更細的）；購物只用在衣服、日用品、3C、家電等非食物的商品。";
