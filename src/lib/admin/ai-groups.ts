// Plain module (no server or client deps) so both the server pages and the
// client chart can import it.
//
// Four chart groups for ai_usage_events.kind. Colors are the dataviz
// reference categorical slots 1–4 in fixed order (validated for CVD
// separation); slots 3–4 are under 3:1 contrast, so the legend plus the
// table under the chart carry identity.
export const AI_GROUPS = {
  text: { label: "一句話記帳", color: "#2a78d6" },
  voice: { label: "語音轉文字", color: "#eb6834" },
  receipt: { label: "收據辨識", color: "#1baf7a" },
  summary: { label: "AI 摘要", color: "#eda100" },
} as const;
export type AiGroup = keyof typeof AI_GROUPS;
export const AI_GROUP_KEYS = Object.keys(AI_GROUPS) as AiGroup[];
export type AiDay = { day: string } & Record<AiGroup, number>;

export function aiGroupOf(kind: string): AiGroup | null {
  if (kind === "quick_add" || kind === "shared_quick_add") return "text";
  if (kind === "voice_transcribe") return "voice";
  if (kind === "receipt_scan") return "receipt";
  if (kind === "monthly_summary") return "summary";
  return null;
}
