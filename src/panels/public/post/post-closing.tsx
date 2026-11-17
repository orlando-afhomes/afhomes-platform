import type { ReactNode } from "react";
import { ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { BLOG_POST_PAGE, type BlogPost } from "@/modules/public-site/content/blog";
import { OFFICES, SITE } from "@/modules/public-site/content/site";
import { PUBLIC_SUPPORT_INFO } from "@/modules/public-site/support-info";
import { Photo } from "../site/blocks";

const SIGN_LINES: Partial<Record<NonNullable<BlogPost["closing"]>, string>> = {
  vip: "Discover your perfect homestyle vacation at AFhomes with the VIP Privilege Loyalty Program.",
  experience: `${SITE.slogan}.`,
};

function ContactRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="post-closing__row">
      <span className="post-closing__icon" aria-hidden="true">{icon}</span>
      <span className="post-closing__row-text">{children}</span>
    </li>
  );
}

/** The wide contact card after the article: resort photo, heading, office, phone, email and Facebook. */
export function PostClosing({ post }: { post: BlogPost }) {
  if (!post.closing) return null;
  const { title, text } = BLOG_POST_PAGE.closing[post.closing];
  const sign = SIGN_LINES[post.closing];
  const office = OFFICES[0];
  const info = PUBLIC_SUPPORT_INFO;
  return (
    <aside className="post-closing" aria-label={title}>
      <Photo image={BLOG_POST_PAGE.closing.image} ratio="16 / 10" className="post-closing__photo" sizes="(min-width: 1024px) 460px, 100vw" />
      <div className="post-closing__content">
        <h2 className="post-closing__title">{title}</h2>
        <p className="post-closing__text">{text}</p>
        <ul className="post-closing__list">
          <ContactRow icon={<MapPin />}>
            <strong>Visit our office:</strong> {office.name}, {office.lines.join(", ")}. {office.landmark}.
          </ContactRow>
          <ContactRow icon={<Phone />}>
            <strong>Mobile:</strong> <a href={info.phoneHref} className="post-closing__link">{info.phone}</a>
          </ContactRow>
          <ContactRow icon={<Mail />}>
            <strong>Email:</strong> <a href={`mailto:${info.email}`} className="post-closing__link">{info.email}</a>
          </ContactRow>
          <ContactRow icon={<ExternalLink />}>
            <a href={SITE.facebookUrl} className="post-closing__link post-closing__link--facebook" target="_blank" rel="noopener noreferrer">
              Send us a message on our Facebook page
            </a>
          </ContactRow>
        </ul>
        {sign ? <p className="post-closing__sign">{sign}</p> : null}
      </div>
    </aside>
  );
}
