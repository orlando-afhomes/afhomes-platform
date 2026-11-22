import { Section, SiteButton } from "../site/blocks";

/** Shared public message when an experience is archived, missing or not published. */
export function ExperienceUnavailable() {
  return (
    <Section tone="soft">
      <div className="site-card">
        <h1 className="site-card__title">This experience is not available</h1>
        <p className="site-card__text">It may have been archived, or the address may be wrong.</p>
        <p><SiteButton href="/#experiences" action="experiences">Back to our experiences</SiteButton></p>
      </div>
    </Section>
  );
}
