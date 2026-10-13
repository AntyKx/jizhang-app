"use client";

import { useEffect } from "react";

// iOS WebKit misplaces the text caret inside a position:fixed popup
// (dialogs, bottom sheets) whenever the document itself scrolls under it —
// which is exactly what iOS does when the keyboard opens: it scrolls the
// page to "reveal" the focused input. The input keeps working, but the
// caret is drawn offset by however far the page moved (user screenshot:
// focus in 備註, caret blinking one field lower beside 日期).
//
// base-ui's own scroll lock deliberately only sets overflow:hidden on iOS,
// which iOS ignores for keyboard scrolling. Pinning <body> with
// position:fixed removes the document's scroll range entirely, so iOS can
// only pan the visual viewport — which doesn't desync the caret. The
// current scroll offset is preserved via `top` and restored on unlock.
//
// Render <IosScrollLock /> inside a popup: it mounts with the popup and
// unmounts after its exit animation. Ref-counted for nested popups (a
// picker sheet opened from a dialog).

let lockCount = 0;
let restore: (() => void) | null = null;

function isIos() {
  return (
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function lock() {
  lockCount += 1;
  if (lockCount > 1) return;
  const { body } = document;
  const scrollY = window.scrollY;
  const previous = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
  };
  Object.assign(body.style, { position: "fixed", top: `-${scrollY}px`, left: "0", right: "0", width: "100%" });
  restore = () => {
    Object.assign(body.style, previous);
    window.scrollTo(0, scrollY);
  };
}

function unlock() {
  lockCount -= 1;
  if (lockCount > 0) return;
  restore?.();
  restore = null;
}

export function IosScrollLock() {
  useEffect(() => {
    if (!isIos()) return;
    lock();
    return unlock;
  }, []);
  return null;
}
