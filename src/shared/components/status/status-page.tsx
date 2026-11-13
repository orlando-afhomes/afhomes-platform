import type { ReactNode } from "react";
import Link from "next/link";
import "./status-page.css";

export type StatusVariant = "400" | "401" | "403" | "404" | "500" | "notice";

const COPY: Record<StatusVariant, { code?: string; title: string; description: string }> = {
  "400": {
    code: "400",
    title: "This link does not work",
    description: "The link is broken or incomplete. Go back and try again, or return to the home page.",
  },
  "401": {
    code: "401",
    title: "Please sign in",
    description: "You are signed out, or your session ended. Sign in to continue.",
  },
  "403": {
    code: "403",
    title: "Access restricted",
    description: "This account does not have access to this page.",
  },
  "404": {
    code: "404",
    title: "Page not found",
    description: "The page you requested does not exist or is not available.",
  },
  "500": {
    code: "500",
    title: "Something went wrong",
    description: "We could not finish that. Please try again. If it keeps happening, tell an Administrator.",
  },
  notice: { title: "Notice", description: "" },
};

function linkClass(primary?: boolean) {
  return `status-page__link${primary ? " status-page__link--primary" : ""}`;
}

export function StatusLink({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <Link href={href} className={linkClass(primary)}>
      {children}
    </Link>
  );
}

export function StatusButton({
  onClick,
  children,
  primary,
}: {
  onClick: () => void;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className={linkClass(primary)}>
      {children}
    </button>
  );
}

/**
 * One friendly page for every error or status. `embedded` renders inside an
 * existing layout (no full-screen centering, no main landmark).
 */
export function StatusPage({
  variant,
  title,
  description,
  embedded = false,
  children,
}: {
  variant: StatusVariant;
  title?: string;
  description?: string;
  embedded?: boolean;
  /** Action buttons or links. */
  children?: ReactNode;
}) {
  const copy = COPY[variant];
  const Root = embedded ? "section" : "main";
  const classes = [
    "status-page",
    `status-page--${variant === "notice" ? "warning" : variant}`,
    embedded ? "" : "status-page--full",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Root className={classes} role={variant === "500" ? "alert" : undefined}>
      {copy.code ? <p className="status-page__code">{copy.code}</p> : null}
      <h1 className="status-page__title">{title ?? copy.title}</h1>
      <p className="status-page__description">{description ?? copy.description}</p>
      {children ? <div className="status-page__actions">{children}</div> : null}
    </Root>
  );
}
