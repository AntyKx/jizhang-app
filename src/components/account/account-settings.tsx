"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import { Camera, LogOut, Trash2 } from "lucide-react";
import { deleteAllUserData } from "@/app/(app)/data-export/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const DELETE_CONFIRM_PHRASE = "刪除帳號";

export function AccountSettings() {
  const { isLoaded, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!isLoaded || !user) {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <Skeleton className="size-24 rounded-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Seeded lazily from the loaded user instead of a useEffect — this is a
  // settings form, not data that changes underneath the user while they're
  // looking at it, so there's no need for a sync effect.
  const displayName = name ?? user.firstName ?? "";

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setUploadingImage(true);
    try {
      await user.setProfileImage({ file });
      toast.success("大頭貼已更新");
    } catch {
      toast.error("大頭貼更新失敗，請稍後再試");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSaveName() {
    if (!user) return;
    const trimmed = displayName.trim();
    if (!trimmed) {
      toast.error("請輸入姓名");
      return;
    }
    setSavingName(true);
    try {
      await user.update({ firstName: trimmed });
      toast.success("姓名已更新");
    } catch {
      toast.error("姓名更新失敗，請稍後再試");
    } finally {
      setSavingName(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut(() => router.push("/sign-in"));
  }

  async function handleDeleteAccount() {
    if (!user) return;
    setDeleting(true);
    try {
      // DB rows are keyed by Clerk userId with no cascade back to Clerk, so
      // wipe app data first (still authenticated) then remove the login
      // itself — otherwise deleting the Clerk user first would orphan every
      // row permanently instead of actually cleaning them up.
      await deleteAllUserData();
      await user.delete();
      router.push("/sign-in");
    } catch {
      toast.error("刪除帳號失敗，請稍後再試");
      setDeleting(false);
    }
  }

  const email = user.primaryEmailAddress?.emailAddress ?? "";

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="group relative size-24 shrink-0 overflow-hidden rounded-full border bg-muted"
            aria-label="更換大頭貼"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={user.imageUrl} alt="" className="size-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="size-6 text-white" />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImagePick}
          />

          <div className="flex w-full flex-col gap-2">
            <Label htmlFor="display-name">顯示名稱</Label>
            <div className="flex gap-2">
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
              />
              <Button
                onClick={handleSaveName}
                disabled={savingName || displayName.trim() === (user.firstName ?? "")}
              >
                {savingName ? "儲存中…" : "儲存"}
              </Button>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2">
            <Label>Email</Label>
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {email}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">帳號</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="justify-start gap-2"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <LogOut className="size-4" />
            {signingOut ? "登出中…" : "登出"}
          </Button>

          {user.deleteSelfEnabled && (
            <Button
              variant="destructive"
              className="justify-start gap-2"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              刪除帳號
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={deleteOpen}
        onOpenChange={(v) => {
          setDeleteOpen(v);
          if (!v) setDeleteConfirmText("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">確定要刪除帳號嗎？</DialogTitle>
            <DialogDescription>
              這會永久刪除你的登入帳號與所有記帳資料（帳戶、交易、預算、儲蓄目標、訂閱與分帳本紀錄），無法復原。請在下方輸入「{DELETE_CONFIRM_PHRASE}」以確認。
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="delete-account-confirm" className="sr-only">
                確認文字
              </Label>
              <Input
                id="delete-account-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={DELETE_CONFIRM_PHRASE}
                autoComplete="off"
              />
            </div>

            <Button
              variant="destructive"
              disabled={deleteConfirmText !== DELETE_CONFIRM_PHRASE || deleting}
              onClick={handleDeleteAccount}
            >
              {deleting ? "刪除中…" : "永久刪除帳號"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
