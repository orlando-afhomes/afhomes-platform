import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { createPortal } from "react-dom";
import * as asyncOptions from "@/data/contracts/async-options";
// shortcut: mock login only, remove when real authentication (Better Auth/API) is implemented
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminAuthGate } from "./admin-auth-gate";
import { DevIdentityProvider, useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { MOCK_SESSION_KEY } from "@/shared/providers/mock-session";

const replace = vi.fn();
const mockPath = { value: "/admin", search: "" };
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => mockPath.value,
  useSearchParams: () => new URLSearchParams(mockPath.search),
}));

beforeEach(() => {
  replace.mockClear();
  mockPath.value = "/admin";
  mockPath.search = "";
  window.localStorage.clear();
});
afterEach(() => {cleanup();vi.restoreAllMocks();});

function Probe() {
  const { signOut } = useDevIdentity();
  return <><button onClick={signOut}>protected</button>{createPortal(<p>Protected portal</p>, document.body)}</>;
}

function mount(client = new QueryClient()) {
  return render(
    <QueryClientProvider client={client}>
      <MockStoreProvider><DevIdentityProvider>
        <AdminAuthGate>
          <Probe />
        </AdminAuthGate>
      </DevIdentityProvider></MockStoreProvider>
    </QueryClientProvider>,
  );
}

describe("admin auth gate", () => {
  it("shows the 401 page with a sign-in link when signed out", () => {
    mount();
    expect(screen.queryByText("protected")).toBeNull();
    expect(screen.getByRole("heading", { name: "Please sign in" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login");
    expect(replace).not.toHaveBeenCalled();
  });

  it("remembers the requested admin page in the sign-in link", () => {
    mockPath.value = "/admin/customers/c1";
    mockPath.search = "tab=a";
    mount();
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe(
      "/login?next=%2Fadmin%2Fcustomers%2Fc1%3Ftab%3Da",
    );
    expect(screen.getByRole("link", { name: "Sales sign in" }).getAttribute("href")).toContain("/login/sales?next=");
  });

  it("restores a stored session after remount and clears it on sign out", async () => {
    window.localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify({ identityId: "dev-admin" }));
    mount();
    expect(await screen.findByText("protected")).toBeDefined();
    expect(replace).not.toHaveBeenCalled();
    act(() => screen.getByText("protected").click());
    expect(window.localStorage.getItem(MOCK_SESSION_KEY)).toBeNull();
    expect(screen.getByRole("heading", { name: "Please sign in" })).toBeDefined();
  });
});

it("unmounts protected portals while access is being revalidated",async()=>{
 window.localStorage.setItem(MOCK_SESSION_KEY,JSON.stringify({identityId:"dev-admin"}));
 const client=new QueryClient();mount(client);
 await screen.findByText("Protected portal");
 let finish!:()=>void;
 vi.spyOn(asyncOptions,"simulateAsync").mockImplementationOnce(()=>new Promise<void>(resolve=>{finish=resolve;}));
 act(()=>{void client.invalidateQueries({queryKey:["access-snapshot"]});});
 await waitFor(()=>expect(screen.queryByText("Protected portal")).toBeNull());
 await act(async()=>{finish();});
 await screen.findByText("Protected portal");client.clear();
});
