// Launch decision (2026-10-02): purchases go through Google Play Billing in
// the Android app only. The web Stripe checkout is still wired up (Stripe is
// in test mode and was never used for real money) but switched off here —
// both the 立即解鎖 button on web and the server action itself check this,
// so a crafted request can't reach checkout either. Flip to true once Stripe
// is moved to live mode and web sales are wanted.
export const WEB_CHECKOUT_ENABLED = false;

export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.anty.jizhang";
