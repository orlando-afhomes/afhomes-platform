import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

// The customer wizard keeps in-progress form state in sessionStorage so a browser
// refresh resumes the same step. Tests must start from a clean session.
beforeEach(() => {
  if (typeof window !== "undefined") window.sessionStorage.clear();
});

// jsdom lacks these browser APIs required by Ant Design components
// (Table, Modal, Drawer, responsive hooks). Minimal no-op shims for tests.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
}

if (typeof window !== "undefined" && typeof window.matchMedia === "undefined") {
  window.matchMedia = (() => ({
    matches: false,
    media: "",
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  })) as unknown as typeof window.matchMedia;
}
