"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { Radio } from "@base-ui/react/radio";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { authenticateMock, type MockPortal } from "@/data/mock/mock-credentials";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { RadioGroup } from "@/shared/ui/radio-group";
import { Spinner } from "@/shared/ui/spinner";
import { ForgotPasswordPanel } from "./forgot-password-panel";
import { validateEmail } from "./login-validation";

export type LoginPortalOption = { value: MockPortal; label: string };

type Props = {
  portals: LoginPortalOption[];
  defaultPortal: MockPortal;
  /** Subcopy under the heading. */
  description: string;
  /** Extra links shown beside "Back to website" (for example "Register as OST"). */
  extraLinks?: ReactNode;
};

// shortcut: mock sign-in latency and credentials; remove with src/data/mock/mock-credentials.ts when real auth is built.
const MOCK_LATENCY_MS = 400;

export function LoginForm({ portals, defaultPortal, description, extraLinks }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status, signIn } = useDevIdentity();
  const id = useId();
  const [view, setView] = useState<"login" | "forgot">("login");
  const [portal, setPortal] = useState<MockPortal>(defaultPortal);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "signed-in") router.replace("/admin");
  }, [status, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const next = {
      email: validateEmail(email) ?? undefined,
      password: password ? undefined : "Enter your password.",
    };
    setErrors(next);
    setAuthError(null);
    if (next.email || next.password) return;

    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    const result = authenticateMock(email.trim(), password, portal);
    if (!result.ok) {
      setAuthError(result.error);
      setSubmitting(false);
      return;
    }
    signIn(result.identityId);
    queryClient.clear();
    router.replace("/admin");
  }

  if (view === "forgot") return <ForgotPasswordPanel onBack={() => setView("login")} />;

  const emailErrorId = `${id}-email-error`;
  const passwordErrorId = `${id}-password-error`;

  return (
    <form noValidate onSubmit={handleSubmit} className="tw:flex tw:flex-col tw:gap-5">
      <div className="tw:flex tw:flex-col tw:gap-2">
        <h1 className="tw:text-3xl tw:font-semibold">Login</h1>
        <p className="tw:text-sm tw:text-(--color-on-dark-muted)">{description}</p>
      </div>

      {portals.length > 1 ? (
        <div className="tw:flex tw:flex-col tw:gap-2">
          <span id={`${id}-portal`} className="tw:text-sm tw:font-medium">
            Sign in as
          </span>
          <RadioGroup
            aria-labelledby={`${id}-portal`}
            value={portal}
            onValueChange={(value) => {
              setPortal(value as MockPortal);
              setAuthError(null);
            }}
            className="login-form__segment-group"
          >
            {portals.map((option) => (
              <Radio.Root key={option.value} value={option.value} className="login-form__segment">
                {option.label}
              </Radio.Root>
            ))}
          </RadioGroup>
        </div>
      ) : null}

      <div className="tw:flex tw:flex-col tw:gap-2">
        <Label htmlFor={`${id}-email`}>Email</Label>
        <Input
          id={`${id}-email`}
          type="email"
          autoComplete="username"
          placeholder="Enter your email"
          className="login-form__input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? emailErrorId : undefined}
        />
        {errors.email ? (
          <p id={emailErrorId} role="alert" className="login-form__error">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div className="tw:flex tw:flex-col tw:gap-2">
        <Label htmlFor={`${id}-password`}>Password</Label>
        <div className="tw:relative">
          <Input
            id={`${id}-password`}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            className="login-form__input tw:pr-12"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? passwordErrorId : undefined}
          />
          <button
            type="button"
            className="login-form__toggle tw:absolute tw:top-1/2 tw:right-3 tw:-translate-y-1/2 tw:p-1"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff className="tw:size-4" aria-hidden="true" /> : <Eye className="tw:size-4" aria-hidden="true" />}
          </button>
        </div>
        {errors.password ? (
          <p id={passwordErrorId} role="alert" className="login-form__error">
            {errors.password}
          </p>
        ) : null}
        <button type="button" className="login-form__link tw:self-end" onClick={() => setView("forgot")}>
          Forgot password?
        </button>
      </div>

      {authError ? (
        <p role="alert" className="login-form__error">
          {authError}
        </p>
      ) : null}

      <Button type="submit" className="login-form__submit" disabled={submitting} aria-busy={submitting}>
        {submitting ? <Spinner /> : null}
        Sign In
      </Button>

      <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-center tw:gap-x-5 tw:gap-y-2">
        <Link href="/" className="login-form__link">
          Back to website
        </Link>
        {extraLinks}
      </div>
    </form>
  );
}
