"use client";

import { useState } from "react";
import { FaqHero } from "./faq-hero";
import { FaqQuestions } from "./faq-questions";

/** Holds the search text so the hero's search box can filter the question list below it. */
export function FaqBrowser() {
  const [query, setQuery] = useState("");
  return (
    <>
      <FaqHero query={query} onQueryChange={setQuery} />
      <FaqQuestions query={query} />
    </>
  );
}
