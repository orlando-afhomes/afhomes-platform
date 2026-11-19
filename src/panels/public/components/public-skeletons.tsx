import type { ReactNode } from "react";
import { FormSkeleton } from "@/shared/components/modern/skeletons";
import { Skeleton } from "@/shared/ui/skeleton";
import { LoginShell } from "../login/login-shell";

const CARD = "tw:flex tw:flex-col tw:gap-3 tw:rounded-2xl tw:p-3";
const PAGE = "tw:mx-auto tw:flex tw:w-full tw:flex-col tw:px-4 tw:md:px-6";

/** One loading announcement per skeleton, with a decorative shape inside. */
function LoadingRegion({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={`public-skeleton ${className ?? ""}`.trim()}>
      <span className="tw:sr-only">Loading…</span>
      {children}
    </div>
  );
}

/** Public hero: dark rounded block, pill line, two title lines, lede and optional actions/media. */
export function PublicHeroSkeleton({ actions = true, media = true }: { actions?: boolean; media?: boolean } = {}) {
  return (
    <LoadingRegion className="tw:mx-auto tw:w-full tw:max-w-7xl tw:px-4 tw:pt-28 tw:md:px-6">
      <div className="tw:flex tw:flex-col tw:gap-8 tw:rounded-3xl tw:px-6 tw:py-12 tw:sm:px-10 tw:lg:flex-row tw:lg:items-center tw:lg:gap-10">
        <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-5">
          <Skeleton className="tw:h-6 tw:w-40 tw:rounded-full" />
          <div className="tw:flex tw:flex-col tw:gap-3">
            <Skeleton className="tw:h-11 tw:w-11/12 tw:rounded-lg tw:sm:h-14" />
            <Skeleton className="tw:h-11 tw:w-2/3 tw:rounded-lg tw:sm:h-14" />
          </div>
          <Skeleton className="tw:h-4 tw:w-4/5 tw:max-w-md" />
          {actions ? (
            <div className="tw:flex tw:flex-wrap tw:gap-3">
              <Skeleton className="tw:h-11 tw:w-36 tw:rounded-full" />
              <Skeleton className="tw:h-11 tw:w-40 tw:rounded-full" />
            </div>
          ) : null}
        </div>
        {media ? <Skeleton className="tw:h-56 tw:w-full tw:rounded-2xl tw:lg:h-72 tw:lg:w-2/5 tw:lg:shrink-0" /> : null}
      </div>
    </LoadingRegion>
  );
}

/** Public section: heading lines and a responsive card grid with image, title and two text lines. */
export function PublicSectionSkeleton({ cards = 3 }: { cards?: number } = {}) {
  return (
    <LoadingRegion className={`${PAGE} tw:gap-6 tw:py-10`}>
      <div className="tw:flex tw:flex-col tw:gap-2">
        <Skeleton className="tw:h-3.5 tw:w-28 tw:rounded-full" />
        <Skeleton className="tw:h-8 tw:w-80 tw:max-w-full" />
        <Skeleton className="tw:h-4 tw:w-[28rem] tw:max-w-full" />
      </div>
      <div className="tw:grid tw:gap-5 tw:sm:grid-cols-2 tw:lg:grid-cols-3">
        {Array.from({ length: cards }, (_, index) => (
          <div key={index} className={CARD}>
            <Skeleton className="tw:h-40 tw:w-full tw:rounded-xl" />
            <Skeleton className="tw:h-5 tw:w-2/3" />
            <Skeleton className="tw:h-3.5 tw:w-full" />
            <Skeleton className="tw:h-3.5 tw:w-4/5" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

/** The three VIP tier cards: a tall stage, the tier name and two stat pairs. */
export function PublicTierGridSkeleton() {
  return (
    <LoadingRegion className={`${PAGE} tw:max-w-7xl tw:py-10`}>
      <div className="tw:grid tw:gap-6 tw:sm:grid-cols-2 tw:lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="tw:flex tw:flex-col tw:gap-4 tw:rounded-2xl tw:p-3">
            <Skeleton className="tw:h-56 tw:w-full tw:rounded-xl" />
            <Skeleton className="tw:h-5 tw:w-1/2" />
            <div className="tw:grid tw:grid-cols-2 tw:gap-3">
              <div className="tw:flex tw:flex-col tw:gap-2">
                <Skeleton className="tw:h-3 tw:w-16" />
                <Skeleton className="tw:h-6 tw:w-20" />
              </div>
              <div className="tw:flex tw:flex-col tw:gap-2">
                <Skeleton className="tw:h-3 tw:w-16" />
                <Skeleton className="tw:h-6 tw:w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

/** Blog article: title, meta line, wide cover and paragraph lines. */
export function PublicArticleSkeleton() {
  const widths = ["tw:w-full", "tw:w-11/12", "tw:w-4/5", "tw:w-full", "tw:w-2/3"];

  return (
    <LoadingRegion className="tw:mx-auto tw:flex tw:w-full tw:max-w-3xl tw:flex-col tw:gap-5 tw:px-4 tw:py-10 tw:md:px-6">
      <Skeleton className="tw:h-10 tw:w-5/6" />
      <Skeleton className="tw:h-4 tw:w-56 tw:max-w-full" />
      <Skeleton className="tw:aspect-video tw:w-full tw:rounded-2xl" />
      <div className="tw:flex tw:flex-col tw:gap-2.5">
        {widths.map((width, index) => (
          <Skeleton key={index} className={`tw:h-4 ${width}`} />
        ))}
      </div>
    </LoadingRegion>
  );
}

/** Form page: heading, white card with label/input pairs, and button blocks. */
export function PublicFormPageSkeleton({ fields = 4, topSpacing = false }: { fields?: number; topSpacing?: boolean } = {}) {
  return (
    <LoadingRegion className={`tw:mx-auto tw:flex tw:w-full tw:max-w-3xl tw:flex-col tw:gap-6 tw:px-4 tw:md:px-6 ${topSpacing ? "tw:pt-28" : "tw:py-8"}`}>
      <div className="tw:flex tw:flex-col tw:gap-2">
        <Skeleton className="tw:h-9 tw:w-3/4" />
        <Skeleton className="tw:h-4 tw:w-full" />
        <Skeleton className="tw:h-4 tw:w-1/2" />
      </div>
      <div className="tw:flex tw:flex-col tw:gap-5 tw:rounded-2xl tw:p-5 tw:sm:p-6">
        <Skeleton className="tw:h-6 tw:w-44" />
        <FormSkeleton fields={fields} />
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
          <Skeleton className="tw:h-11 tw:w-32 tw:rounded-lg" />
          <Skeleton className="tw:h-11 tw:w-24 tw:rounded-lg" />
        </div>
      </div>
    </LoadingRegion>
  );
}

/** Login pages: the real login shell around a form skeleton. */
export function PublicLoginSkeleton() {
  return (
    <LoginShell>
      <LoadingRegion className="tw:flex tw:w-full tw:flex-col tw:gap-5">
        <div className="tw:flex tw:flex-col tw:gap-2">
          <Skeleton className="tw:h-9 tw:w-36" />
          <Skeleton className="tw:h-4 tw:w-72 tw:max-w-full" />
        </div>
        <div className="tw:flex tw:flex-col tw:gap-2">
          <Skeleton className="tw:h-3.5 tw:w-16" />
          <Skeleton className="tw:h-11 tw:w-full tw:rounded-lg" />
        </div>
        <div className="tw:flex tw:flex-col tw:gap-2">
          <Skeleton className="tw:h-3.5 tw:w-20" />
          <Skeleton className="tw:h-11 tw:w-full tw:rounded-lg" />
        </div>
        <Skeleton className="tw:h-11 tw:w-full tw:rounded-lg" />
      </LoadingRegion>
    </LoginShell>
  );
}
