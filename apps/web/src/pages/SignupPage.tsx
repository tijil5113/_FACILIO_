import { AuthForm } from "@/features/auth/AuthForm";
import { AuthShell } from "@/components/layout/AuthShell";

export function SignupPage() {
  return (
    <AuthShell
      title="Create account"
      subtitle="Create an account to continue to FACILIO."
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
