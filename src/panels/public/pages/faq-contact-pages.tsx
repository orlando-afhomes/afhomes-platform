import { Clock, MessageCircleMore, ShieldCheck } from "lucide-react";
import { ContactCards, Photo, SectionHeading, SiteButton } from "../site/blocks";
import { SiteCta } from "../site/site-cta";
import { ContactForm } from "../site/contact-form";
import { ContactMaps } from "../contact/contact-maps";
import { FaqBrowser } from "../faq/faq-browser";
import { FaqHelp } from "../faq/faq-help";
import { FaqClosing } from "../faq/faq-closing";
import "../faq/faq-hero.css";
import "../faq/faq-questions.css";
import "../faq/faq-help.css";
import "../faq/faq-closing.css";

/**
 * FAQ page, laid out from the owner's FAQ reference design.
 * The wrapper reuses the Home page styling (`site-home`); `site-faq-page` marks this page for its own tweaks and the header's "FAQ" underline.
 */
export function FaqPage() {
  return (
    <div className="site-home site-faq-page">
      <FaqBrowser />
      <FaqHelp />
      <FaqClosing />
    </div>
  );
}

const CONTACT_HELP = [
  { icon: MessageCircleMore, title: "We’re happy to help", text: "Our team is ready to assist with resort inquiries, reservations, and partnerships." },
  { icon: Clock, title: "Business hours", text: "Contact our team to confirm office hours." },
  { icon: ShieldCheck, title: "Quick and secure", text: "Your message is sent directly from your email app. We do not store what you type here." },
];

export function ContactPage() {
  return (
    <div className="site-home site-contact-page">
      <section className="contact-hero" aria-labelledby="contact-title">
        <Photo
          image={{ src: "/images/site/resort/amenities-w-pool1.webp", alt: "" }}
          className="contact-hero__photo"
          sizes="100vw"
          priority
        />
        <div className="contact-page__inner contact-hero__inner">
          <p className="site-eyebrow site-eyebrow--light">We would love to hear from you</p>
          <h1 id="contact-title" className="contact-hero__title">Contact Us</h1>
          <p className="contact-hero__lede">Reach our offices by phone or email, send a message on Facebook, or use the form below.</p>
        </div>
      </section>

      <div className="contact-page__inner contact-page__body">
        <section id="contact-form" className="contact-message" aria-label="Write to us">
          <div className="contact-message__guide">
            <SectionHeading eyebrow="Send a message" title="Write to us" text="Fill in the form and your email app opens with the message ready to send to our office." />
            <ul className="contact-message__help">
              {CONTACT_HELP.map(({ icon: Icon, title, text }) => (
                <li key={title} className="contact-message__tip">
                  <span className="contact-message__icon"><Icon aria-hidden="true" /></span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="site-panel contact-message__panel">
            <ContactForm />
          </div>
        </section>

        <section aria-label="Contact details">
          <ContactCards />
        </section>

        <ContactMaps />
      </div>

      <SiteCta
        className="contact-closing"
        titleId="contact-closing-title"
        title="Plan your next stay with AFhomes"
        text="Reach out to our team for resort inquiries, reservations, and partnership opportunities."
        image={{ src: "/images/site/resort/amenities-w-terraces-pool1.webp", alt: "" }}
        photoClassName="contact-closing__photo"
        note="Resort images are architectural renderings."
      >
        <SiteButton href="#contact-form" action="talk" surface="dark">Talk to us</SiteButton>
      </SiteCta>
    </div>
  );
}
