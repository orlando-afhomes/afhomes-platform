"use client";

import { usePublicExperiences } from "@/data/public-content-queries";
import { EXPERIENCE_CARDS } from "@/modules/public-site/content/experiences";
import { SiteFeatureCard } from "@/shared/components/site";

/**
 * Public experience cards driven by the Experiences content repository. The
 * approved three destinations show immediately (and during loading); newly
 * published entries appear without a code change.
 */
export function ExperienceCardList() {
  const experiences = usePublicExperiences();
  const cards = experiences.isPending
    ? EXPERIENCE_CARDS
    : (experiences.data ?? []).map((item) => ({
        href: `/experiences/${item.slug}`,
        title: item.title,
        status: item.status,
        statusTone: item.statusTone,
        text: item.summary,
        image: item.image,
      }));

  if (cards.length === 0) {
    return <p className="site-note">No experiences are published right now.</p>;
  }

  return (
    <ul className="site-grid site-grid--3">
      {cards.map((card) => (
        <li key={card.href} className="site-home-reveal">
          <SiteFeatureCard href={card.href} title={card.title} text={card.text} image={card.image} badge={{ label: card.status, tone: card.statusTone }} />
        </li>
      ))}
    </ul>
  );
}
