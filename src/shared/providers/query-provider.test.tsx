import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { NotConnectedError } from "@/data/http/client";
import { QueryProvider } from "./query-provider";

afterEach(cleanup);

it("does not retry a screen the backend does not serve yet", async () => {
  const run = vi.fn(async () => {
    throw new NotConnectedError("roles.list");
  });
  function View() {
    const query = useQuery({ queryKey: ["not-connected"], queryFn: run });
    return <p>{query.isError ? "error" : "loading"}</p>;
  }
  render(
    <QueryProvider>
      <View />
    </QueryProvider>,
  );
  expect(await screen.findByText("error")).toBeInTheDocument();
  expect(run).toHaveBeenCalledTimes(1);
});
