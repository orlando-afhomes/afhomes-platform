import { Droplet, HandHeart, HardHat, MapPinned, RefreshCw, type LucideIcon } from "lucide-react";
import { COMPLIANCE_PAGE, COMPLIANCE_PHASES } from "@/modules/public-site/content/compliance";
import { Section, SectionHeading } from "../site/blocks";

/** Icon per phase number; phase 4 also layers a droplet inside the cycle arrows (see `PhaseIcon`). */
const PHASE_ICONS: Record<number, LucideIcon> = { 1: MapPinned, 2: HandHeart, 3: Droplet, 4: RefreshCw, 5: HardHat };

function PhaseIcon({ phase }: { phase: number }) {
  const Icon = PHASE_ICONS[phase] ?? MapPinned;
  return (
    <div className="compliance-journey__icon" aria-hidden="true">
      <Icon className="compliance-journey__icon-glyph" strokeWidth={1.25} />
      {phase === 4 ? <Droplet className="compliance-journey__icon-inner" strokeWidth={1.5} /> : null}
    </div>
  );
}

/** "Our compliance journey": vertical timeline of the five regulatory phases. */
export function ComplianceJourney() {
  const { eyebrow, title, text } = COMPLIANCE_PAGE.journey;
  return (
    <Section tone="soft" className="compliance-journey">
      <SectionHeading eyebrow={eyebrow} title={title} text={text} />
      <ol className="compliance-journey__list">
        {COMPLIANCE_PHASES.map((phase) => {
          const [first, ...rest] = phase.paragraphs;
          return (
            <li key={phase.phase} className="compliance-journey__item">
              <span className="compliance-journey__marker" aria-hidden="true">
                {phase.phase}
              </span>
              <article className="compliance-journey__card site-home-reveal">
                <PhaseIcon phase={phase.phase} />
                <div className="compliance-journey__body">
                  <h3 className="compliance-journey__title">
                    Phase {phase.phase}: {phase.title}
                  </h3>
                  <p className="compliance-journey__subtitle">{phase.subtitle}</p>
                  {first ? <p className="compliance-journey__text">{first}</p> : null}
                  {phase.bullets?.length ? (
                    <ul className="compliance-journey__bullets">
                      {phase.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                  {rest.map((paragraph) => (
                    <p key={paragraph} className="compliance-journey__text">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
