"use client";

import { useState } from "react";

/**
 * Compares the current form snapshot with the values captured when the form opened.
 * Pass a stable object of primitive values; sort arrays before including them.
 * Call reset() after a successful save so the button disables again.
 */
export function useFormDirty<T>(current: T): { dirty: boolean; reset: () => void } {
  const [baseline, setBaseline] = useState<T>(current);
  return {
    dirty: JSON.stringify(baseline) !== JSON.stringify(current),
    reset: () => setBaseline(current),
  };
}
