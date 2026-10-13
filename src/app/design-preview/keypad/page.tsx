const VARIANTS = [
  { v: "current", title: "目前線上版", note: "金額下方一大塊空白" },
  { v: "A", title: "A：預留空間移到最底部", note: "金額下面接著其他欄位，空白藏在鍵盤後面" },
  { v: "B", title: "B：鍵盤嵌在抽屜裡", note: "按鍵直接長在金額下方，按「完成」收起" },
  { v: "C", title: "C：不處理遮擋", note: "鍵盤上方顯示分類，金額欄位仍會被擋到" },
];

// Each frame is a real phone-width page (390×844) running the actual
// components, scaled down to fit four side by side.
export default function KeypadPreviewPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col gap-6 bg-muted/40 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">記帳數字鍵盤預覽</h1>
        <p className="text-sm text-muted-foreground">
          每格都是 iPhone 寬度（390×844）的真實畫面，縮小 75% 顯示。可以直接在格子裡點按鍵、按「完成」收起鍵盤、再點金額打開。
        </p>
      </div>
      <div className="flex flex-wrap gap-6">
        {VARIANTS.map(({ v, title, note }) => (
          <div key={v} className="flex flex-col gap-2">
            <div className="flex w-[293px] flex-col">
              <span className="text-sm font-semibold">{title}</span>
              <span className="text-xs text-muted-foreground">{note}</span>
            </div>
            <div className="h-[633px] w-[293px] overflow-hidden rounded-[2rem] border-4 border-foreground/80 bg-background shadow-lg">
              <iframe
                src={`/design-preview/keypad/frame?v=${v}`}
                title={title}
                className="h-[844px] w-[390px] origin-top-left scale-75 border-0"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
