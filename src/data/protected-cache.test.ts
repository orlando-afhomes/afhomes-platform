import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { clearProtectedQueries, refreshAccessAfterMutation } from "./protected-cache";

describe("protected cache cleanup", () => {
  it("removes all identities' protected records and retains only public projections", async () => {
    const client = new QueryClient();
    const privateKeys = [["business", "contracts", "dev-admin"], ["members", "dev-ost-a1"], ["accounts", "dev-super-admin"], ["audit", "dev-admin"]];
    for (const key of privateKeys) client.setQueryData(key, ["private"]);
    for (const key of ["public-experiences", "public-offers", "public-vip-products"]) client.setQueryData([key], ["published"]);
    await refreshAccessAfterMutation(client);
    for (const key of privateKeys) expect(client.getQueryData(key)).toBeUndefined();
    for (const key of ["public-experiences", "public-offers", "public-vip-products"]) expect(client.getQueryData([key])).toEqual(["published"]);
    client.clear();
  });

  it("prevents a late protected request from repopulating a switched identity's cache", async () => {
    const client = new QueryClient();
    let resolve!: (value: string[]) => void;
    const key = ["business", "contracts", "dev-admin"];
    const pending = client.fetchQuery({queryKey:key, queryFn:()=>new Promise<string[]>(done=>{resolve=done;})}).catch(()=>undefined);
    clearProtectedQueries(client);
    resolve(["old broad records"]);
    await pending;
    expect(client.getQueryData(key)).toBeUndefined();
    client.clear();
  });
});
