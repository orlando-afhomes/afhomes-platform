"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Map as MapIcon, MapPin } from "lucide-react";
import type { SiteImage } from "@/modules/public-site/content/experiences";
import { SiteMapEmbed } from "@/shared/components/site/site-map-embed";
import { Photo, Section, SiteButton } from "../site/blocks";
import { PhotoLightbox } from "./photo-lightbox";

type LocationTab = "plan" | "map";

const TABS: { value: LocationTab; label: string; Icon: typeof MapPin }[] = [
  { value: "plan", label: "Site plan", Icon: MapPin },
  { value: "map", label: "Resort map", Icon: MapIcon },
];

/** Location: heading, things to do, and a tabbed panel (site plan or live map) with an info card. */
export function ExperienceLocation({ id, eyebrow, title, activities, sitePlan, map }: {
  id?: string;
  eyebrow: string;
  title: string;
  activities: string[];
  sitePlan: { title: string; text: string; image: SiteImage };
  map: { title: string; text: string; embedSrc: string; href: string };
}) {
  const baseId = useId();
  const [tab, setTab] = useState<LocationTab>("plan");
  const [planIndex, setPlanIndex] = useState<number | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const headingId = `${baseId}-heading`;
  const tabId = (value: LocationTab) => `${baseId}-tab-${value}`;
  const panelId = (value: LocationTab) => `${baseId}-panel-${value}`;

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;
    event.preventDefault();
    setTab(TABS[next].value);
    tabRefs.current[next]?.focus();
  }

  return (
    <Section id={id} className="exp-location">
      <header className="site-heading exp-location__heading">
        <p className="site-eyebrow">{eyebrow}</p>
        <h2 id={headingId} className="site-heading__title exp-location__title">{title}</h2>
      </header>

      {activities.length > 0 ? (
        <div className="exp-location__activities">
          <p className="exp-location__activities-label">Things to do</p>
          <ul className="exp-location__chips">
            {activities.map((activity) => (
              <li key={activity} className="exp-location__chip">{activity}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div role="tablist" aria-labelledby={headingId} className="exp-location__tabs">
        {TABS.map(({ value, label, Icon }, index) => {
          const selected = tab === value;
          return (
            <button
              key={value}
              ref={(node) => { tabRefs.current[index] = node; }}
              type="button"
              role="tab"
              id={tabId(value)}
              aria-selected={selected}
              aria-controls={panelId(value)}
              tabIndex={selected ? 0 : -1}
              className="exp-location__tab"
              onClick={() => setTab(value)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
            >
              <Icon aria-hidden="true" className="exp-location__tab-icon" />
              {label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={panelId("plan")} aria-labelledby={tabId("plan")} hidden={tab !== "plan"} className="exp-location__panel">
        <Photo image={sitePlan.image} ratio="16 / 9" className="exp-location__media" sizes="(min-width: 1024px) 800px, 100vw" />
        <div className="exp-location__card">
          <h3 className="exp-location__card-title">{sitePlan.title}</h3>
          <p className="exp-location__card-text">{sitePlan.text}</p>
          <button type="button" className="site-button site-button--primary exp-location__card-action" onClick={() => setPlanIndex(0)}>
            View plan <ArrowRight aria-hidden="true" className="exp-location__action-icon" />
          </button>
        </div>
      </div>

      <div role="tabpanel" id={panelId("map")} aria-labelledby={tabId("map")} hidden={tab !== "map"} className="exp-location__panel">
        {/* Mounted only when shown so the map iframe does not load behind the site plan. */}
        {tab === "map" ? <SiteMapEmbed src={map.embedSrc} title={map.title} className="exp-location__media exp-location__map" /> : null}
        <div className="exp-location__card">
          <h3 className="exp-location__card-title">{map.title}</h3>
          <p className="exp-location__card-text">{map.text}</p>
          <span className="exp-location__card-action">
            <SiteButton href={map.href} action="directions" external>Get directions</SiteButton>
          </span>
        </div>
      </div>

      <PhotoLightbox images={[sitePlan.image]} index={planIndex} onIndexChange={setPlanIndex} title={sitePlan.title} />
    </Section>
  );
}
