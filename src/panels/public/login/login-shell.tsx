import Image from "next/image";
import type { ReactNode } from "react";
import "./login.css";

const CARDS = [
  { tier: "bronze", src: "/images/cards/bronze.webp" },
  { tier: "silver", src: "/images/cards/silver.webp" },
  { tier: "gold", src: "/images/cards/gold.webp" },
] as const;

/** Full-screen login layout: art panel on the left (top band on mobile), `children` is the green form panel. */
export function LoginShell({ children }: { children: ReactNode }) {
  return (
    <main className="login-shell">
      <span className="login-shell__bubble login-shell__bubble--one" aria-hidden="true" />
      <span className="login-shell__bubble login-shell__bubble--two" aria-hidden="true" />
      <span className="login-shell__bubble login-shell__bubble--three" aria-hidden="true" />
      <span className="login-shell__bubble login-shell__bubble--four" aria-hidden="true" />
      <div className="login-shell__card">
        <section className="login-shell__art" aria-label="AFhomes">
          <div className="tw:relative tw:flex tw:items-center tw:gap-3">
            <Image src="/images/logo.png" alt="AFhomes" width={44} height={44} priority className="tw:size-11 tw:object-contain" />
            <span className="tw:text-xl tw:font-bold tw:tracking-tight tw:text-(--color-brand-primary)">AFhomes</span>
          </div>
          <p className="tw:relative tw:max-w-[18rem] tw:text-sm tw:text-(--color-text-secondary) tw:md:text-base">
            Welcome back. Sign in to manage memberships, your network, and your day-to-day work.
          </p>
          <div aria-hidden="true" className="tw:contents">
            <span className="login-shell__blob login-shell__blob--large tw:hidden tw:md:block" />
            <span className="login-shell__blob login-shell__blob--small tw:hidden tw:md:block" />
            <span className="login-shell__dot login-shell__dot--one" />
            <span className="login-shell__dot login-shell__dot--two tw:hidden tw:md:block" />
            <span className="login-shell__dot login-shell__dot--three tw:hidden tw:md:block" />
            <div className="login-shell__cards">
              {CARDS.map((card) => (
                <Image
                  key={card.tier}
                  src={card.src}
                  alt=""
                  width={1920}
                  height={1198}
                  className={`login-shell__card-image login-shell__card-image--${card.tier}`}
                />
              ))}
            </div>
            <svg className="login-shell__edge" viewBox="0 0 120 600" preserveAspectRatio="none" fill="currentColor">
              <path d="M120 0 H70 C20 90 90 190 55 290 C20 390 100 480 60 600 H120 Z" />
            </svg>
          </div>
          <p className="login-shell__footer">&copy; {new Date().getFullYear()} AFhomes</p>
        </section>
        <section className="tw:relative tw:flex tw:flex-col tw:justify-center tw:p-6 tw:text-(--color-on-dark) tw:md:p-12">{children}</section>
      </div>
    </main>
  );
}
