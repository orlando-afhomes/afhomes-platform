import type { ReactNode } from "react";
import type { SiteImage } from "@/modules/public-site/content/experiences";
import { SiteCta } from "../site/site-cta";

/** Closing CTA band; the shared public-site layout over a faint photo. */
export function ExperienceClosing({ title, text, image, children }: { title: string; text: string; image: SiteImage; children?: ReactNode }) {
  return (
    <SiteCta title={title} text={text} image={image}>
      {children}
    </SiteCta>
  );
}
