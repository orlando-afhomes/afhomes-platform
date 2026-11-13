import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useWizardStepHistory } from "./use-wizard-step-history";

beforeEach(() => window.history.replaceState(null, "", "/"));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Harness({ guarded, requestExit }: { guarded: boolean; requestExit: (leave: () => void) => void }) {
  const [step, setStep] = useState(0);
  useWizardStepHistory({ step, onStep: setStep, guarded, requestExit });
  return (
    <div>
      <output aria-label="step">{step}</output>
      <button type="button" onClick={() => setStep((value) => value + 1)}>next</button>
    </div>
  );
}

const stepText = () => screen.getByLabelText("step").textContent;

describe("wizard step history", () => {
  it("shows the step in the URL and lets Back and Forward move between steps", async () => {
    const user = userEvent.setup();
    render(<Harness guarded={false} requestExit={vi.fn()} />);
    await user.click(screen.getByText("next"));
    await user.click(screen.getByText("next"));
    expect(stepText()).toBe("2");
    expect(window.location.search).toBe("?step=2");

    act(() => window.history.back());
    await waitFor(() => expect(stepText()).toBe("1"));
    expect(window.location.search).toBe("?step=1");
    act(() => window.history.forward());
    await waitFor(() => expect(stepText()).toBe("2"));
  });

  it("raises the exit prompt when Back would leave a guarded wizard, and restores the position", async () => {
    const user = userEvent.setup();
    const requestExit = vi.fn();
    render(<Harness guarded requestExit={requestExit} />);
    await user.click(screen.getByText("next"));
    act(() => window.history.back());
    await waitFor(() => expect(stepText()).toBe("0"));
    const go = vi.spyOn(window.history, "go");
    act(() => window.history.back());
    await waitFor(() => expect(requestExit).toHaveBeenCalledTimes(1));
    expect(go).toHaveBeenCalledWith(1);
    await waitFor(() => expect(window.history.state?.cwIdx).toBeGreaterThan(0));
    expect(stepText()).toBe("0");
  });

  it("keeps going back without a prompt when nothing is unsaved", async () => {
    const requestExit = vi.fn();
    render(<Harness guarded={false} requestExit={requestExit} />);
    const go = vi.spyOn(window.history, "go");
    act(() => window.history.back());
    await waitFor(() => expect(go).toHaveBeenCalledWith(-1));
    expect(requestExit).not.toHaveBeenCalled();
  });
});
