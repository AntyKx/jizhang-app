"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          // touch-pan-y: redundant with the document root now being
          // pan-y-only (see globals.css), kept as explicit
          // self-documentation — same reasoning as bottom-sheet.tsx.
          // overflow-x-hidden: this element also carries a transform
          // (the -translate-x/y-1/2 centering) — same defensive reasoning
          // as bottom-sheet.tsx's inner content div, since `overflow` and
          // `transform` together on one element is a known unreliable
          // WebKit combination for clipping.
          // max-h + overflow-y-auto: without a height cap a tall dialog
          // (e.g. 轉帳 with many accounts) grew past the viewport with
          // nothing to scroll, so the confirm button was unreachable.
          // Both the cap and the centering are measured inside the safe
          // area, not the physical screen: the app draws under the status
          // bar (black-translucent / Android edge-to-edge), and a dialog
          // reaching up there had its close button under the clock, where
          // iOS swallows taps (scroll-to-top) and Android pulls down the
          // notification shade. Set here so every dialog gets it — don't
          // override max-h per call site, that drops the safe-area math.
          "touch-pan-y overflow-x-hidden max-h-[calc(100dvh_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)_-_2rem)] overflow-y-auto fixed top-[calc(50%_+_(env(safe-area-inset-top)_-_env(safe-area-inset-bottom))_/_2)] left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {/* Zero-height sticky rail so the X stays pinned to the top while a
            tall dialog scrolls, instead of scrolling away with the content.
            Has to come first in the DOM — a sticky element only pins once
            its natural position scrolls past. -mb-4 cancels the grid gap
            this extra child would otherwise add. */}
        {showCloseButton && (
          <div className="sticky top-0 z-20 -mb-4 h-0">
            <DialogPrimitive.Close
              data-slot="dialog-close"
              render={
                <Button
                  variant="ghost"
                  className="absolute -top-2 -right-2"
                  size="icon-sm"
                />
              }
            >
              <XIcon
              />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
        )}
        {children}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      // Sticky (with an opaque background) so the title stays visible
      // alongside the pinned X while the body scrolls; -top-4/-mx-4/-mt-4
      // cancel DialogContent's p-4. pr-10 keeps a long title clear of the X.
      className={cn("sticky -top-4 z-10 -mx-4 -mt-4 flex flex-col gap-2 bg-popover px-4 pt-4 pr-10 pb-1", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        // Sticky so the confirm button stays reachable while a tall dialog
        // scrolls (-bottom-4 cancels the content's p-4). The background is
        // bg-muted/50 pre-mixed onto the popover color — it has to be opaque
        // or scrolled content shows through.
        "sticky -bottom-4 z-10 -mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-[color-mix(in_oklab,var(--color-muted)_50%,var(--color-popover))] p-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
