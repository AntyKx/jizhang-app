import { SignUp } from "@clerk/nextjs";
import { BearIllustration } from "@/components/bear-illustration";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <BearIllustration name="welcome" size={140} alt="歡迎加入" className="rounded-3xl" />
      <SignUp />
    </div>
  );
}
