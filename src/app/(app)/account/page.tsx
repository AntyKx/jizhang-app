import { requireUserId } from "@/lib/auth";
import { AccountSettings } from "@/components/account/account-settings";

export default async function AccountPage() {
  await requireUserId();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">帳號設定</h1>
      <AccountSettings />
    </div>
  );
}
