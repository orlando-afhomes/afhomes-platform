import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { AccreditationVerificationPage } from "./pages/accreditation-verification-page";

function Wrapper() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider>
          <AccreditationVerificationPage />
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(cleanup);

async function search(user: ReturnType<typeof userEvent.setup>, number: string) {
  await user.clear(screen.getByRole("textbox", { name: /AA number/ }));
  await user.type(screen.getByRole("textbox", { name: /AA number/ }), number);
  await user.click(screen.getByRole("button", { name: "Search" }));
}

describe("public seller check", () => {
  it("refuses a malformed number before any dialog", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    await search(user, "HELLO");
    expect(screen.getByText("Enter a valid AA number.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks for the privacy tick and contact details, then shows the masked result", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    await search(user, "AAO26100004");

    const privacy = await screen.findByRole("dialog", { name: "Privacy notice" });
    const next = screen.getByRole("button", { name: "Continue" });
    expect(next).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    await user.click(next);
    expect(privacy).not.toBeInTheDocument();

    await screen.findByRole("dialog", { name: "Your contact details" });
    await user.click(screen.getByRole("button", { name: "Verify accreditation" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid name, email and mobile number.");
    await user.type(screen.getByLabelText(/^Name/), "Pedro Reyes");
    await user.type(screen.getByLabelText(/^Email/), "pedro@example.com");
    await user.type(screen.getByLabelText(/^Mobile/), "09171234567");
    await user.click(screen.getByRole("button", { name: "Verify accreditation" }));

    const result = await screen.findByRole("region", { name: "Verification result" }, { timeout: 3000 });
    expect(result).toHaveTextContent("AAO26100004");
    expect(result).toHaveTextContent("Accredited");
    expect(result).not.toHaveTextContent("Valid until");
    expect(result).toHaveTextContent(/\*/);
    expect(result).toHaveTextContent("SECURITY BANK");
    // The visitor's own details are never shown back.
    expect(document.body).not.toHaveTextContent("pedro@example.com");

    // The contact receipt is reused for the next search in this session.
    await search(user, "AAI26100001");
    await user.click(await screen.findByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Your details are already validated for this session.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Verify accreditation" }));
    // A pending IST is not shown as valid: one generic message.
    expect(await screen.findByText(/No active accreditation was found/, undefined, { timeout: 3000 })).toBeInTheDocument();
  });
});
