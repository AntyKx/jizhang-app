---
name: android-release
description: Ships a new Android build of 小熊記帳本 (jizhang-app, com.anty.jizhang) to the Google Play Console closed-testing Alpha track — bumps the version, deploys the web app first, builds a signed release AAB, uploads it via browser automation, writes release notes, and submits for review. Use this whenever the user asks to "上架", "建新版本", "release/ship the Android app", "publish to alpha/closed testing", or after fixing any bug that needs to reach testers, even if they just say something like "把這個修好的版本上架" or "build version X and upload it". Also offers to monitor the Google review status afterward and report back when it passes.
metadata:
  author: user
  version: 1.0.0
---

# Android release: 小熊記帳本 → Play Console Alpha

This is an operational runbook for a specific, repeatable release process. Follow it in order — the ordering between steps 2 and 3 especially is not arbitrary (see the note there).

## Before starting: scope the change

Ask yourself (or the user, if unclear) what actually changed since the last release:

- **Web/JS-only fix** (most React/TSX/API-route changes): still needs a full release for record-keeping and because the Android app is what testers install, but the fix itself goes live the moment you deploy to Vercel — Step 2 below.
- **Native change** (anything under `android/`, e.g. `MainActivity.java`, `AndroidManifest.xml`, `capacitor.config.ts`, native plugin versions): only takes effect once a new AAB is built, uploaded, reviewed, and installed by the user. This is the part that actually requires this whole runbook.

Why this distinction matters: this app's Capacitor shell is **just a WebView pointing at a live Next.js production deployment** (`capacitor.config.ts` → `server.url: "https://jizhang.bearledger.app"`). It is not a bundled static app. So a pure web-side bug fix is already "shipped" to every existing install as soon as it's on Vercel — the Android version bump exists mainly to keep the two in sync and to give testers something to explicitly update to. But if you skip the web deploy and only ship the AAB, you have NOT actually fixed anything for users — the WebView will just load the old, unfixed production site.

## Step 1 — Confirm the keystore exists

Release builds must be signed. Check:

```bash
ls android/keystore.properties
```

This file is gitignored and local-only. If it's missing, **stop and tell the user** — you cannot produce a signed release AAB without it, and there's no safe way to generate one on their behalf (it's tied to their existing Play Console app signing key).

## Step 2 — Bump the version

Edit `android/app/build.gradle`, inside `defaultConfig`:

```gradle
versionCode 4        // increment by 1 from whatever it currently is
versionName "1.3"     // bump the human-readable version — ask the user if the right bump (patch vs minor) isn't obvious from context
```

`versionCode` must strictly increase every release or Play Console will reject the upload. `versionName` is cosmetic (shown to users) — a bug-fix-only release is normally a patch bump (1.2 → 1.3), a new feature is more debatable; ask if unsure.

## Step 3 — Verify, then deploy the web app (before building the AAB)

Run these and confirm all clean before doing anything else:

```bash
npx tsc --noEmit
npx eslint <changed files>   # or the whole src/ tree if changes are spread out
npx next build
```

Then, if there's any web/JS-side change in this release (see "scope the change" above — this is true for most releases):

```bash
vercel --prod --yes
```

This deploys to the production domain the WebView loads. Do this **before** building the AAB, not after — the AAB doesn't contain the fix, so there's no ordering risk in deploying web first, but there is real risk in doing the AAB build/upload/review cycle (which can take hours to days) and then forgetting the actual web deploy, leaving users stuck on the old broken JS code even after they update the Android app.

## Step 4 — Build the signed release AAB

Requires **JDK 21**, not whatever Android Studio's bundled JBR defaults to (on this machine that's JDK 25, which breaks this project's Gradle 8.14.3 — a known mismatch, not a one-off fluke). Point `JAVA_HOME` at the JDK 21 install for this command only; don't change any global/persistent environment variable.

On this machine the JDK 21 path is `C:\Users\Anty\.jdks\jbr-21.0.11`. If that path doesn't exist anymore, list `~/.jdks` (or `C:\Users\Anty\.jdks`) to find the current JDK 21 folder name before proceeding.

Run from a PowerShell tool (this is a Windows machine):

```powershell
$env:JAVA_HOME = "C:\Users\Anty\.jdks\jbr-21.0.11"
cd "<repo-root>\android"
.\gradlew.bat bundleRelease
```

Expect `BUILD SUCCESSFUL`. Some "Deprecated Gradle features" warnings are normal noise from Capacitor's plugin projects — not a failure.

Confirm the output artifact exists:

```bash
find android/app/build/outputs/bundle -iname "*.aab"
```

It lands at `android/app/build/outputs/bundle/release/app-release.aab`, typically **~25–27 MB**. Note that size — it matters in the next step.

## Step 5 — Upload to Play Console (Alpha closed-testing track)

This app's Play Console identifiers (stable across sessions — use these direct links instead of clicking through the console):

- App list / developer home: `https://play.google.com/console/u/0/developers/4624898050038694529/app-list`
- App dashboard: `https://play.google.com/console/u/0/developers/4624898050038694529/app/4972068740477192444/app-dashboard`
- **Alpha closed-testing track** (go here directly): `https://play.google.com/console/u/0/developers/4624898050038694529/app/4972068740477192444/tracks/4699117158043264521`
- Publishing / release overview (for checking review status): `https://play.google.com/console/u/0/developers/4624898050038694529/app/4972068740477192444/publishing`

Use claude-in-chrome — the user's real Chrome is already signed into this Play Console account, so just navigate and interact, no login flow needed.

1. On the Alpha track page, click **建立新版本** (Create new release).
2. On the upload screen: **the AAB is ~25+ MB, which exceeds claude-in-chrome's `file_upload` tool 10 MB limit — do not attempt `file_upload` on it, it will fail.** Instead, tell the user the exact absolute path (e.g. `D:\...\android\app\build\outputs\bundle\release\app-release.aab`) and ask them to drag it into the upload box (or click 上傳) themselves. Wait for their confirmation before continuing.
3. Once the uploaded bundle shows the new version/code, click **下一步** (Next). You'll land on a review page ("預覽並確認" / "檢查版本").
4. It's normal and expected to see a warning about a **missing ProGuard/R8 mapping file** here — this project has `minifyEnabled false` in `build.gradle` (no code shrinking is used), so there is no mapping file to have. This warning is harmless noise, not a blocker — don't let it stop you.
5. Scroll to **版本詳細資訊** and find the **版本資訊** (release notes) textarea. It starts as a template:
   ```
   <zh-TW>
   在此輸入或貼上 zh-TW 的版本資訊
   </zh-TW>
   ```
   Click in, select-all, and replace with real zh-TW release notes describing what actually changed this release (summarize from the conversation/commits — don't just repeat this template).
6. Click **下一步** again to return to the review page, then click **儲存** (Save).
7. A dialog appears: "要前往「發布總覽」頁面嗎？" — click **前往總覽頁面**.

## Step 6 — Submit for review

On the publishing overview page, you'll see **尚未送審的變更** (changes not yet submitted) listing this release. Click **送審 N 項變更** (top right). A confirmation dialog explains Google's review "通常會在 7 天內完成，但也可能需要更長的時間" — click **將變更送審** to confirm.

The page then shows **審查中的變更** with an automated pre-check progress bar ("正在快速檢查常見問題", up to ~14 minutes) before the release actually reaches Google's human/automated review queue. This pre-check is separate from — and much faster than — the actual review.

## Step 7 — Offer to monitor review status

Ask the user if they want you to watch for the review to complete rather than making them check manually. If yes, invoke the `loop` skill in **dynamic mode** (no fixed interval) with a prompt along these lines:

> Check whether the Google Play Console closed-testing (Alpha track) review for 小熊記帳本, version <X> (<versionName>), has passed. Navigate to `https://play.google.com/console/u/0/developers/4624898050038694529/app/4972068740477192444/publishing` and check the "審查中的變更" section. If still pending, mark noop and check again later. If the pending-review section is gone or a "應用程式更新已發布" notification appears, tell the user the version passed review and stop the loop.

Start with ~30-minute check intervals; it's fine to space out to an hour on later checks since Google's review can take anywhere from under an hour to several days.

## Notes on why things are this way

- **Why deploy web before building the AAB, not after**: the AAB itself carries no fix for JS-side bugs — the WebView always loads whatever is live on Vercel. Building/uploading/waiting-for-review first would mean users update their app and *still* hit the old bug, which defeats the entire point of the release.
- **Why JDK 21 specifically**: this repo's Gradle version (8.14.3) doesn't run correctly under JDK 25, which is what Android Studio's bundled runtime currently ships. This isn't a one-time environment quirk — it'll keep being true until either Gradle or the JDK setup changes, so always set `JAVA_HOME` for the build command explicitly rather than assuming the default toolchain works.
- **Why the ProGuard warning is safe to ignore**: it only fires because `minifyEnabled` is `false` (no R8/ProGuard shrinking or obfuscation is configured for this project), so there is no mapping file to have uploaded in the first place. It's Play Console noting an absence, not flagging a defect.
- **Why `file_upload` can't handle the AAB directly**: the tool enforces a 10 MB combined-size cap per call, and this project's release bundle runs ~25–27 MB — comfortably over that limit every time. There's no workaround from the automation side; a human has to do that one click/drag.
