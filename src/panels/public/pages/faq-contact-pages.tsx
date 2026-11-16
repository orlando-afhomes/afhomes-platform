import { FAQ_HELP, FAQ_INTRO, FAQ_ITEMS } from "@/modules/public-site/content/faq";
import { PAYMENT_DISCLAIMER } from "@/modules/public-site/content/site";
import { ContactCards, CtaBand, PageHero, Section, SectionHeading, SiteButton } from "../site/blocks";
import { ContactForm } from "../site/contact-form";
import { FaqList } from "../site/faq-list";

export function FaqPage() {
  return (
    <>
      <PageHero eyebrow={FAQ_INTRO.lede} title={FAQ_INTRO.title} lede={FAQ_INTRO.text} />
      <Section>
        <div className="site-narrow">
          <FaqList items={FAQ_ITEMS} />
          <p className="site-callout">{PAYMENT_DISCLAIMER}</p>
        </div>
      </Section>
      <Section tone="soft">
        <SectionHeading eyebrow="Still curious?" title={FAQ_HELP.title} text={FAQ_HELP.text} />
        <ContactCards />
      </Section>
      <CtaBand title="Discover your perfect VIP Privilege Loyalty Program level" text="Learn more about the exclusive benefits of our VIP Privilege Loyalty Program and how to become a valued Primary Cardholder.">
        <SiteButton href="/vip-privilege" variant="light">See the VIP Privilege Card</SiteButton>
      </CtaBand>
    </>
  );
}

export function ContactPage() {
  return (
    <>
      <PageHero eyebrow="We would love to hear from you" title="Contact Us" lede="Reach our offices by phone or email, send a message on Facebook, or use the form below." />
      <Section>
        <ContactCards />
      </Section>
      <Section tone="soft">
        <div className="site-two-up site-two-up--form">
          <div>
            <SectionHeading eyebrow="Send a message" title="Write to us" text="Fill in the form and your email app opens with the message ready to send to our office." />
          </div>
          <div className="site-panel">
            <ContactForm />
          </div>
        </div>
      </Section>
    </>
  );
}
