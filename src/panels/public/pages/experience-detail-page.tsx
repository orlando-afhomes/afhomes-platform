"use client";

import { Leaf, Map as MapIcon, Mountain, Sparkles, Waves } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePublicExperiences } from "@/data/public-content-queries";
import { ExperienceHero } from "../experience/exp-hero";
import { ExperienceOverview } from "../experience/exp-overview";
import { ExperienceClosing } from "../experience/exp-closing";
import { ExperienceUnavailable } from "../experience/experience-unavailable";
import { Section, SiteButton } from "../site/blocks";

const HIGHLIGHT_ICONS: LucideIcon[] = [MapIcon, Waves, Mountain, Leaf, Sparkles];

/** A newly added destination's own page, built from its Experiences record. */
export function ExperienceDetailPage({ slug }: { slug: string }) {
  const experiences = usePublicExperiences();

  if (experiences.isPending) {
    return (
      <Section>
        <p role="status" className="site-note">Loading experience…</p>
      </Section>
    );
  }

  const experience = experiences.data?.find((item) => item.slug === slug);
  if (!experience) return <ExperienceUnavailable />;

  const features = experience.highlights.map((item, index) => ({ ...item, icon: HIGHLIGHT_ICONS[index % HIGHLIGHT_ICONS.length] }));

  return (
    <div className="site-home site-experience-page">
      <ExperienceHero
        eyebrow={experience.category}
        title={experience.title}
        lede={experience.summary}
        status={experience.status}
        statusTone={experience.statusTone}
        image={experience.image}
      >
        <SiteButton href="#overview" action="learn" surface="dark">Learn more</SiteButton>
        <SiteButton href="/contact" action="contact" surface="dark">Contact us</SiteButton>
      </ExperienceHero>
      <ExperienceOverview id="overview" eyebrow={experience.category} title="What to expect" text={experience.overview} features={features} />
      <ExperienceClosing title="Plan your visit" text="Contact our office to plan your stay or celebration." image={experience.image}>
        <SiteButton href="/contact" action="contact" surface="dark">Contact us</SiteButton>
      </ExperienceClosing>
    </div>
  );
}
