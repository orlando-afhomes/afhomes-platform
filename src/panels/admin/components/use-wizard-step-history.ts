"use client";

import { useCallback, useEffect, useRef } from "react";

type WizardHistoryState = { cwIdx?: number; cwStep?: number } & Record<string, unknown>;

function currentState(): WizardHistoryState {
  const state = window.history.state as WizardHistoryState | null;
  return state && typeof state === "object" ? state : {};
}

function stepUrl(step: number) {
  const url = new URL(window.location.href);
  if (step > 0) url.searchParams.set("step", String(step));
  else url.searchParams.delete("step");
  return url.pathname + url.search + url.hash;
}

/**
 * Puts the wizard step in the address (`?step=N`) so the browser Back and Forward buttons move between steps.
 *
 * History layout: the entry the user arrived on is kept as a base entry (index 0) and every step lives on its own
 * entry above it. Back from the first step therefore lands on the base entry, where the exit guard runs: when
 * `guarded` the position is restored and `requestExit` raises the Save / Discard / Stay prompt, otherwise the
 * user simply continues back out of the wizard. A reload starts a blank wizard at step 1 (the URL step is ignored).
 *
 * shortcut: after a reload, Back still walks the old step entries (each shows its step with the blank form);
 * upgrade when step entries can be trimmed from the Next.js router.
 */
export function useWizardStepHistory({
  step,
  onStep,
  guarded,
  requestExit,
}: {
  step: number;
  onStep: (step: number) => void;
  guarded: boolean;
  requestExit: (leave: () => void) => void;
}) {
  const indexRef = useRef(0);
  const entryStepRef = useRef(0);
  const allowExitRef = useRef(false);
  const latest = useRef({ guarded, requestExit, onStep });
  useEffect(() => {
    latest.current = { guarded, requestExit, onStep };
  });

  // First render: reset the URL to step 1 and add the first step entry above the base entry.
  useEffect(() => {
    const existing = currentState();
    if (typeof existing.cwIdx === "number") {
      // Reload or a repeated mount: keep the entry, restart at step 1.
      indexRef.current = existing.cwIdx;
      window.history.replaceState({ ...existing, cwStep: 0 }, "", stepUrl(0));
    } else {
      window.history.replaceState({ ...existing, cwIdx: 0, cwStep: 0 }, "", stepUrl(0));
      window.history.pushState({ ...currentState(), cwIdx: 1, cwStep: 0 }, "", stepUrl(0));
      indexRef.current = 1;
    }
    entryStepRef.current = 0;
  }, []);

  // A step change made by the user adds an entry; one that came from Back or Forward does not.
  useEffect(() => {
    if (allowExitRef.current || entryStepRef.current === step) return;
    entryStepRef.current = step;
    indexRef.current += 1;
    window.history.pushState({ ...currentState(), cwIdx: indexRef.current, cwStep: step }, "", stepUrl(step));
  }, [step]);

  useEffect(() => {
    function onPop(event: PopStateEvent) {
      const state = event.state as WizardHistoryState | null;
      if (!state || typeof state.cwIdx !== "number") return;
      indexRef.current = state.cwIdx;
      if (state.cwIdx > 0) {
        entryStepRef.current = state.cwStep ?? 0;
        latest.current.onStep(state.cwStep ?? 0);
        return;
      }
      // Base entry: the user is leaving the wizard.
      if (allowExitRef.current || !latest.current.guarded) {
        allowExitRef.current = true;
        window.history.go(-1);
        return;
      }
      window.history.go(1);
      latest.current.requestExit(() => {
        allowExitRef.current = true;
        window.history.go(-(indexRef.current + 1));
      });
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /** Call just before leaving on purpose (Cancel, Discard, Save and leave) so the guard stays out of the way. */
  const allowExit = useCallback(() => {
    allowExitRef.current = true;
  }, []);
  return { allowExit };
}
