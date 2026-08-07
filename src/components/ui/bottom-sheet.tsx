"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"

import { cn } from "@/lib/utils"

function BottomSheet({ ...props }: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root data-slot="bottom-sheet" swipeDirection="down" {...props} />
}

function BottomSheetPortal({ ...props }: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="bottom-sheet-portal" {...props} />
}

function BottomSheetBackdrop({ className, ...props }: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="bottom-sheet-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:transition-none",
        className
      )}
      {...props}
    />
  )
}

function BottomSheetContent({
  className,
  children,
  containerRef,
  ...props
}: DrawerPrimitive.Popup.Props & { containerRef?: React.Ref<HTMLDivElement> }) {
  return (
    <BottomSheetPortal>
      <BottomSheetBackdrop />
      <DrawerPrimitive.Viewport className="fixed inset-x-0 bottom-0 z-50 flex justify-center">
        <DrawerPrimitive.Popup
          data-slot="bottom-sheet-content"
          className={cn(
            "flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-b-0 bg-card pt-3 shadow-lg outline-none",
            "[transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-300 ease-out data-swiping:transition-none",
            "data-ending-style:translate-y-full data-starting-style:translate-y-full",
            className
          )}
          {...props}
        >
          <div className="mx-auto mb-1 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
          <div
            ref={containerRef}
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            {children}
          </div>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </BottomSheetPortal>
  )
}

function BottomSheetTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="bottom-sheet-title"
      className={cn("font-heading text-base leading-none font-medium", className)}
      {...props}
    />
  )
}

export { BottomSheet, BottomSheetContent, BottomSheetTitle }
