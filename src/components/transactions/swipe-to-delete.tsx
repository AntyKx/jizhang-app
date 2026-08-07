"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Action = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  // Background/text color for this action's revealed button, e.g.
  // "bg-destructive text-white" or "bg-primary/80 text-primary-foreground".
  className: string;
};

const DRAG_THRESHOLD = 8;
const ACTION_WIDTH = 72; // matches the w-18 button below

// Swipe-left-to-reveal-actions gesture, extracted out of
// today-transaction-row.tsx (the original, only place this existed) so
// every detail-list row across the app — transactions, transfers, shared
// expenses — shares one swipe mechanic instead of each screen inventing its
// own delete affordance (some had a swipe, others a plain inline trash
// button, which read as inconsistent). `onTap` fires on a plain tap while
// the row is closed (e.g. to open an edit dialog); `onLongPress` is
// optional extra behavior layered on top (today-transaction-row's
// long-press-for-quick-category).
export function SwipeToDelete({
  actions,
  onTap,
  onLongPress,
  disabled = false,
  children,
}: {
  actions: Action[];
  onTap?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const actionsWidth = actions.length * ACTION_WIDTH;
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({
    startX: 0,
    startY: 0,
    baseline: 0,
    dragging: false,
    verticalScroll: false,
    longPressFired: false,
  });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearLongPressTimer() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (disabled || actionsWidth === 0) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseline: offset,
      dragging: false,
      verticalScroll: false,
      longPressFired: false,
    };
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        dragState.current.longPressFired = true;
        onLongPress();
      }, 500);
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (disabled || actionsWidth === 0) return;
    const state = dragState.current;
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    if (!state.dragging && !state.verticalScroll) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      clearLongPressTimer();
      if (Math.abs(dy) > Math.abs(dx)) {
        // Vertical scroll intent — remember this for pointerup so a swipe
        // that starts slightly diagonally (very common with a thumb) can't
        // fall through to "plain tap" and fire onTap.
        state.verticalScroll = true;
        return;
      }
      state.dragging = true;
      setIsDragging(true);
    }

    if (!state.dragging) return;
    const next = Math.min(0, Math.max(-actionsWidth, state.baseline + dx));
    setOffset(next);
  }

  function handlePointerUp() {
    clearLongPressTimer();
    const state = dragState.current;
    if (state.dragging) {
      state.dragging = false;
      setIsDragging(false);
      setOffset(offset < -actionsWidth / 2 ? -actionsWidth : 0);
      return;
    }
    if (state.verticalScroll || state.longPressFired) return;
    // Plain tap: close an already-open row instead of firing onTap.
    if (offset !== 0) {
      setOffset(0);
      return;
    }
    onTap?.();
  }

  return (
    <div className="relative overflow-hidden">
      {actions.length > 0 && (
        <div className="absolute inset-y-0 right-0 flex">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => {
                setOffset(0);
                a.onClick();
              }}
              className={cn("flex w-18 flex-col items-center justify-center gap-0.5 text-xs font-medium", a.className)}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      )}

      <div
        role={onTap ? "button" : undefined}
        tabIndex={onTap ? 0 : undefined}
        className={cn(
          "touch-pan-y bg-card transition-transform",
          onTap && "cursor-pointer hover:bg-muted",
        )}
        style={{
          transform: `translateX(${offset}px)`,
          transitionDuration: isDragging ? "0ms" : "200ms",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={
          onTap
            ? (e) => {
                // Pointer events never fire from a keyboard interaction, so
                // Enter/Space needs its own path straight to onTap — mirrors
                // how RegularRow was a real <button> (keyboard-operable)
                // before this component replaced it.
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onTap();
                }
              }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
