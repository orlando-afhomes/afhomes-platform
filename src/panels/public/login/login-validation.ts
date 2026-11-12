const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return "Enter your email.";
  return EMAIL_PATTERN.test(email) ? null : "Enter a valid email address.";
}
