"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { validateEmail } from "./login-validation";

// shortcut: no recovery backend; wire code + link email to the account's registered email when auth is built.
export function ForgotPasswordPanel({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = validateEmail(email);
    setError(message);
    if (!message) setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="tw:flex tw:flex-col tw:gap-5">
        <h1 className="tw:text-3xl tw:font-semibold">Forgot password</h1>
        <p role="status" className="tw:text-sm tw:text-(--color-on-dark-muted)">
          Password recovery by email is not available yet. Contact your administrator.
        </p>
        <Button type="button" className="login-form__submit" onClick={onBack}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="tw:flex tw:flex-col tw:gap-5">
      <div className="tw:flex tw:flex-col tw:gap-2">
        <h1 className="tw:text-3xl tw:font-semibold">Forgot password</h1>
        <p className="tw:text-sm tw:text-(--color-on-dark-muted)">Enter your registered email and we will send a reset link.</p>
      </div>
      <div className="tw:flex tw:flex-col tw:gap-2">
        <Label htmlFor="forgot-email">Registered email</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          className="login-form__input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "forgot-email-error" : undefined}
        />
        {error ? (
          <p id="forgot-email-error" role="alert" className="login-form__error">
            {error}
          </p>
        ) : null}
      </div>
      <Button type="submit" className="login-form__submit">
        Send reset link
      </Button>
      <button type="button" className="login-form__link tw:self-center" onClick={onBack}>
        Back to sign in
      </button>
    </form>
  );
}
