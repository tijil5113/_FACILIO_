import { AuthForm } from "@/features/auth/AuthForm";
import { AuthShell } from "@/components/layout/AuthShell";

export function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to FACILIO.">
      <AuthForm mode="login" />
    </AuthShell>
  );
}
