import { PRIVACY_EFFECTIVE_DATE, PRIVACY_SECTIONS } from "@/modules/public-site/content/privacy";
import { RETENTION_SCHEDULE } from "@/modules/audit/retention";

/** Public privacy policy (Data Privacy Act of 2012). Sits in the solid-header group because it is a light, text-first page. */
export function PrivacyPage() {
  return (
    <article className="tw:mx-auto tw:flex tw:w-full tw:max-w-3xl tw:flex-col tw:gap-8 tw:px-4 tw:py-10 sm:tw:py-14">
      <header className="tw:flex tw:flex-col tw:gap-2">
        <h1 className="tw:text-3xl tw:font-semibold">Privacy Policy</h1>
        <p className="tw:text-sm tw:text-muted-foreground">Effective {PRIVACY_EFFECTIVE_DATE}. Under the Data Privacy Act of 2012 (RA 10173).</p>
      </header>
      {PRIVACY_SECTIONS.map((section) => (
        <section key={section.id} aria-labelledby={`privacy-${section.id}`} className="tw:flex tw:flex-col tw:gap-3">
          <h2 id={`privacy-${section.id}`} className="tw:text-xl tw:font-semibold">{section.title}</h2>
          {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {section.items ? <ul className="tw:list-disc tw:space-y-1 tw:pl-6">{section.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
          {section.id === "keep" ? (
            <>
              <p>We keep personal information only as long as we need it for the purpose it was collected for and for our legal duties. A legal hold pauses disposal. After the period ends we delete or anonymise the record.</p>
              <div className="tw:overflow-x-auto">
                <table className="tw:w-full tw:border-collapse tw:text-left tw:text-sm">
                  <caption className="tw:sr-only">Records retention schedule</caption>
                  <thead>
                    <tr className="tw:border-b">
                      <th scope="col" className="tw:py-2 tw:pr-4 tw:font-semibold">Record</th>
                      <th scope="col" className="tw:py-2 tw:pr-4 tw:font-semibold">Kept for</th>
                      <th scope="col" className="tw:py-2 tw:font-semibold">Counted from</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RETENTION_SCHEDULE.map((rule) => (
                      <tr key={rule.id} className="tw:border-b">
                        <th scope="row" className="tw:py-2 tw:pr-4 tw:font-normal">{rule.label}</th>
                        <td className="tw:py-2 tw:pr-4">{rule.years === null ? "Until withdrawn" : `${rule.years} ${rule.years === 1 ? "year" : "years"}`}</td>
                        <td className="tw:py-2">{rule.start}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>
      ))}
    </article>
  );
}
