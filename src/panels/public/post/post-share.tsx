"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, Link2 } from "lucide-react";

const subscribeNever = () => () => {};

// Lucide has no brand icons, so the two logos are small inline glyphs.
function FacebookGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21h3Z" />
    </svg>
  );
}

function LinkedinGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M6.9 8.8H3.8V20h3.1V8.8ZM5.3 3.8a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6ZM20.2 13.6c0-3-1.6-4.9-4.2-4.9-1.4 0-2.4.7-2.9 1.5V8.8h-3V20h3.1v-5.6c0-1.5.6-2.6 2-2.6 1.3 0 1.9 1 1.9 2.6V20h3.1v-6.4Z" />
    </svg>
  );
}

/** Share buttons for one post. The full address is built after mount; before that the links use the path so server and client markup match. */
export function PostShare({ title, path }: { title: string; path: string }) {
  // The origin only exists in the browser; the server snapshot is "" so the first render matches.
  const origin = useSyncExternalStore(subscribeNever, () => window.location.origin, () => "");
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const url = `${origin}${path}`;
  const encoded = encodeURIComponent(url);

  async function copy() {
    try {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="post-share" role="group" aria-label={`Share "${title}"`}>
      <a className="post-share__button" href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook">
        <FacebookGlyph />
      </a>
      <a className="post-share__button" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">
        <LinkedinGlyph />
      </a>
      <button type="button" className="post-share__button" onClick={copy} aria-label="Copy link">
        {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
      </button>
      <span className="post-share__status" aria-live="polite">{copied ? "Copied" : ""}</span>
    </div>
  );
}
