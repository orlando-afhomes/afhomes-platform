import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Tailwind is namespaced with the "tw" prefix (see globals.css), so conflict
// resolution must understand prefixed utilities such as tw:px-2.
const twMerge = extendTailwindMerge({ prefix: "tw" });

/** Merges conditional class names and resolves conflicting prefixed Tailwind utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
