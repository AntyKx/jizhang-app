// Allowlisted product-analytics events (ui_events.name). Plain module so the
// client callers, the server action and /admin all share one list.
export const UI_EVENT_LABELS = {
  voice_tap: "按下麥克風",
  voice_notice_shown: "看到語音隱私說明",
  voice_notice_accepted: "同意並開始錄音",
  voice_permission_denied: "麥克風權限被拒",
  voice_unsupported: "裝置不支援錄音",
  voice_too_short: "錄音太短",
  voice_failed: "語音辨識失敗",
  first_record_chip: "點新手範例句",
  first_record_voice_chip: "點新手「用說的試試」",
  quickadd_tip_dismissed: "關閉一句話記帳提示",
  monthly_report_seen: "看到小熊月報",
  trial_report_seen: "看到試用報告",
  locked_preview_unlock_tap: "鎖定統計點「解鎖」",
  account_limit_seen: "新增第 2 個帳戶被擋",
  account_limit_unlock_tap: "帳戶上限點「解鎖」",
} as const;

export type UiEventName = keyof typeof UI_EVENT_LABELS;
