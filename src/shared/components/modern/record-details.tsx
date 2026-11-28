import type { ReactNode } from "react";
import { Banknote, CalendarDays, FileText, History, Info, MapPin, ShieldCheck, User, UsersRound } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type DetailRowItem = {
  label: string;
  value: ReactNode;
  /** Let the value span both columns (long text, addresses, notes). */
  wide?: boolean;
  action?: ReactNode;
};

export type DetailTone = "brand" | "success" | "warning" | "info" | "danger" | "neutral";

export type DetailSection = {
  title?: string;
  /** Icon in the section's tinted chip. Defaults from the title (see DEFAULT_ICONS). */
  icon?: ReactNode;
  /** Colour of the chip. Defaults from the title, else "brand". */
  tone?: DetailTone;
  rows?: ReadonlyArray<DetailRowItem>;
  /** Custom content (badges, lists, module chips) rendered between the heading and rows. */
  content?: ReactNode;
  layout?: "list";
};

export type DetailHistoryItem = { key: string; when: string; text: string };

const TONE_CHIP: Record<DetailTone, string> = {
  brand: "tw:bg-primary/10 tw:text-primary",
  success: "tw:bg-success/10 tw:text-success",
  warning: "tw:bg-warning/10 tw:text-warning",
  info: "tw:bg-info/10 tw:text-info",
  danger: "tw:bg-destructive/10 tw:text-destructive",
  neutral: "tw:bg-muted tw:text-muted-foreground",
};

/** First matching title keyword picks the default icon and tone for a section. */
const DEFAULT_ICONS: ReadonlyArray<{ match: RegExp; icon: ReactNode; tone: DetailTone }> = [
  { match: /event|activity|action/i, icon: <CalendarDays />, tone: "info" },
  { match: /actor|owner|user/i, icon: <User />, tone: "brand" },
  { match: /change|previous|history/i, icon: <History />, tone: "warning" },
  { match: /amount|payment|price|money|commission|balance|collection|receipt|fee|total|points/i, icon: <Banknote />, tone: "success" },
  { match: /date|schedule|period|validity|time/i, icon: <CalendarDays />, tone: "info" },
  { match: /customer|member|seller|buyer|holder|agent|people|contact|account|profile|person|referrer/i, icon: <User />, tone: "brand" },
  { match: /network|team|downline|upline|sponsor/i, icon: <UsersRound />, tone: "brand" },
  { match: /address|location|venue|branch|property/i, icon: <MapPin />, tone: "info" },
  { match: /status|review|approval|audit|security|permission|access|risk/i, icon: <ShieldCheck />, tone: "warning" },
  { match: /contract|document|note|reason|detail|summary|sale|record/i, icon: <FileText />, tone: "neutral" },
];

function sectionStyle(section: DetailSection): { icon: ReactNode; tone: DetailTone } {
  const found = section.title ? DEFAULT_ICONS.find(({ match }) => match.test(section.title as string)) : undefined;
  return { icon: section.icon ?? found?.icon ?? <Info />, tone: section.tone ?? found?.tone ?? "brand" };
}

const CARD = "tw:flex tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:border-border tw:bg-card tw:p-4 tw:shadow-xs";
const SECTION_TITLE = "tw:m-0 tw:text-sm tw:font-semibold tw:text-foreground";

function SectionHeading({ icon, tone, title }: { icon: ReactNode; tone: DetailTone; title: string }) {
  return (
    <div className="tw:flex tw:items-center tw:gap-2.5">
      <span
        aria-hidden="true"
        className={cn("tw:flex tw:size-8 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:*:[svg]:size-4", TONE_CHIP[tone])}
      >
        {icon}
      </span>
      <h3 className={SECTION_TITLE}>{title}</h3>
    </div>
  );
}

function GridRows({ rows }: { rows: ReadonlyArray<DetailRowItem> }) {
  return (
    <div className="tw:overflow-hidden">
      <dl className="tw:m-0 tw:-mb-[11px] tw:grid tw:grid-cols-1 tw:gap-x-6 tw:sm:grid-cols-2">
        {rows.map((row, rowIndex) => (
          <div
            key={`${row.label}-${rowIndex}`}
            className={cn(
              "tw:flex tw:min-w-0 tw:flex-col tw:gap-0.5 tw:border-b tw:border-border/70 tw:py-2.5 tw:first:pt-0",
              row.wide && "tw:sm:col-span-2",
            )}
          >
            <dt className="tw:text-xs tw:font-medium tw:text-muted-foreground">{row.label}</dt>
            <dd className="tw:m-0 tw:text-sm tw:font-semibold tw:wrap-break-word tw:text-foreground tw:tabular-nums">
              {row.value === null || row.value === undefined || row.value === "" ? "—" : row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ListRows({ rows }: { rows: ReadonlyArray<DetailRowItem> }) {
  return (
    <ul className="tw:m-0 tw:list-none tw:divide-y tw:divide-border tw:p-0">
      {rows.map((row) => (
        <li key={row.label} className="tw:grid tw:items-center tw:gap-2 tw:py-3 tw:first:pt-0 tw:last:pb-0 tw:sm:grid-cols-[minmax(0,1fr)_auto] tw:sm:gap-4">
          <div className="tw:min-w-0 tw:wrap-break-word">
            <div className="tw:text-sm tw:font-semibold">{row.label}</div>
            <div className="tw:text-xs tw:text-muted-foreground">{row.value}</div>
          </div>
          {row.action ? <div className="tw:justify-self-start tw:sm:justify-self-end">{row.action}</div> : null}
        </li>
      ))}
    </ul>
  );
}

/** Shared section card used by the details sheet and dialog. */
export function DetailSectionCard({ section }: { section: DetailSection }) {
  const { icon, tone } = sectionStyle(section);
  const rows = section.rows ?? [];
  return (
    <section aria-label={section.title} className={CARD}>
      {section.title ? <SectionHeading icon={icon} tone={tone} title={section.title} /> : null}
      {section.content}
      {rows.length > 0 ? (section.layout === "list" ? <ListRows rows={rows} /> : <GridRows rows={rows} />) : null}
    </section>
  );
}

/** Shared append-only-looking history list (presentation only). */
export function DetailHistory({ history }: { history: ReadonlyArray<DetailHistoryItem> }) {
  if (history.length === 0) return null;
  return (
    <section aria-label="History" className={CARD}>
      <SectionHeading icon={<History />} tone="neutral" title="History" />
      <ol className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-4 tw:border-l tw:border-border tw:p-0 tw:pl-5">
        {history.map((item) => (
          <li key={item.key} className="tw:relative tw:flex tw:flex-col tw:gap-0.5">
            <span
              aria-hidden="true"
              className="tw:absolute tw:top-1.5 tw:-left-6.5 tw:size-2 tw:rounded-full tw:bg-primary tw:ring-4 tw:ring-background"
            />
            <span className="tw:text-xs tw:text-muted-foreground tw:tabular-nums">{item.when}</span>
            <span className="tw:text-sm tw:wrap-break-word">{item.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
