import { useId, useState, type SyntheticEvent } from "react";
import { Link } from "react-router";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Callout } from "@/components/ui/Callout";
import { Field } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import {
  hasAuthFieldErrors,
  validateAuthFields,
  type AuthFieldErrors,
} from "@/features/auth/auth-validation";
import {
  AUTH_SUBMIT_NOTICE,
  AUTH_UNAVAILABLE_BODY,
  AUTH_UNAVAILABLE_TITLE,
} from "@/lib/auth-status";
import { PUBLIC_PRIMARY_CTA } from "@/features/public/public-content";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [attempted, setAttempted] = useState(false);

  const submitLabel = mode === "login" ? "Sign in" : "Create account";
  const switchTo =
    mode === "login"
      ? { to: "/signup", label: "Create account" }
      : { to: "/login", label: "Sign in" };

  function onSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = validateAuthFields(email, password);
    setErrors(next);
    if (hasAuthFieldErrors(next)) {
      return;
    }
    setAttempted(true);
    setPassword("");
  }

  return (
    <div className="mt-6 max-w-md">
      <Callout tone="info" title={AUTH_UNAVAILABLE_TITLE}>
        {AUTH_UNAVAILABLE_BODY}
      </Callout>
      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        <Input
          id={emailId}
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          error={errors.email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />
        <Field label="Password" htmlFor={passwordId} error={errors.password}>
          <div className="relative">
            <input
              id={passwordId}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? `${passwordId}-error` : undefined}
              className="facilio-control pr-10"
              onChange={(event) => {
                setPassword(event.target.value);
              }}
            />
            <IconButton
              label={showPassword ? "Hide password" : "Show password"}
              className="absolute top-1/2 right-1 -translate-y-1/2"
              onClick={() => {
                setShowPassword((value) => !value);
              }}
            >
              {showPassword ? (
                <EyeOff size={16} aria-hidden="true" />
              ) : (
                <Eye size={16} aria-hidden="true" />
              )}
            </IconButton>
          </div>
        </Field>
        {attempted ? (
          <p
            className="type-body-sm text-ink-secondary"
            role="status"
            data-testid="auth-submit-truth"
            data-auth-backend="not-implemented"
          >
            {AUTH_SUBMIT_NOTICE}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="submit">{submitLabel}</Button>
          <ButtonLink to="/overview" variant="secondary">
            {PUBLIC_PRIMARY_CTA}
          </ButtonLink>
        </div>
      </form>
      <p className="type-body-sm mt-6 text-ink-muted">
        {mode === "login" ? "Need an account?" : "Already have an account?"}{" "}
        <Link
          to={switchTo.to}
          className="text-ink underline decoration-line underline-offset-4"
        >
          {switchTo.label}
        </Link>
        . Account actions are not available yet.
      </p>
    </div>
  );
}
