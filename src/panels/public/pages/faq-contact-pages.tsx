import { ArrowRight, ArrowUpRight, Clock, MapPin, MessageCircleMore, ShieldCheck } from "lucide-react";
import { ABOUT } from "@/modules/public-site/content/about";
import { ContactCards, Photo, SectionHeading, SiteButton } from "../site/blocks";
import { ContactForm } from "../site/contact-form";
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
  const { address, directionsHref } = ABOUT.visit;

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
        <section aria-label="Contact details">
          <ContactCards />
        </section>

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
          <div className="contact-location">
            <Photo
              image={{ src: "/images/site/home/arial-1-scaled.webp", alt: "Aerial architectural rendering of the AFhomes resort" }}
              className="contact-location__photo"
              sizes="(min-width: 900px) 40vw, 90vw"
            />
            <div className="contact-location__details">
              <MapPin aria-hidden="true" className="contact-location__pin" />
              <div>
                <h3>Our Location</h3>
                <address>{address}</address>
              </div>
              <SiteButton href={directionsHref} variant="light" external>View on Map <ArrowUpRight aria-hidden="true" /></SiteButton>
            </div>
          </div>
        </section>
      </div>

      <section className="site-home-cta contact-closing" aria-labelledby="contact-closing-title">
        <Photo
          image={{ src: "/images/site/resort/amenities-w-terraces-pool1.webp", alt: "" }}
          className="site-home-cta__photo contact-closing__photo"
          sizes="100vw"
        />
        <div className="site-home-cta__shade" aria-hidden="true" />
        <div className="contact-page__inner">
          <div className="site-cta">
            <h2 id="contact-closing-title" className="site-cta__title">Plan your next stay with AFhomes</h2>
            <p className="site-cta__text">Reach out to our team for resort inquiries, reservations, and partnership opportunities.</p>
            <div className="site-cta__actions">
              <SiteButton href="#contact-form" variant="gold">Talk to us <ArrowRight aria-hidden="true" /></SiteButton>
            </div>
          </div>
          <p className="contact-closing__note">Resort images are architectural renderings.</p>
        </div>
      </section>
    </div>
  );
}
