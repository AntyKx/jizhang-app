import { SignIn } from "@clerk/nextjs";
import { BearIllustration } from "@/components/bear-illustration";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <BearIllustration name="welcome" size={140} alt="歡迎回來" className="rounded-3xl" />
      <SignIn />
    </div>
  );
}
