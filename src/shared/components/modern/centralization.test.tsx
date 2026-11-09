"use client";

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { toast } from "sonner";
import { AppToaster, notify } from "./app-toaster";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { CardSection } from "./card-section";
import { FilterBar } from "./filter-bar";
import { FormDialog, ReasonDialog } from "./form-dialog";
import { Money } from "./money";
import { QueryState } from "./query-state";
import { SearchInput } from "./search-input";
import { Section } from "./section";
import { StatTiles } from "./stat-tiles";
import { TabBar } from "./tab-bar";
import { useActionRunner } from "./use-action-runner";
import { DataTable, type ColumnDef } from "./data-table";
import { formatDate } from "@/shared/lib/format-date";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { DesignationBadge } from "@/shared/components/business/designation-badge";
import { RoleBadge } from "@/shared/components/business/role-badge";
import { Button } from "@/shared/ui/button";

afterEach(() => {
  cleanup();
  toast.dismiss();
});

describe("centralized Card", () => {
  it("renders the default surface with the app card classes", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Desc</CardDescription>
          <CardAction>
            <button type="button">Go</button>
          </CardAction>
        </CardHeader>
        <CardContent>Body</CardContent>
      </Card>,
    );
    const card = screen.getByText("Body").closest("div[data-slot='card']")!;
    expect(card.className).toContain("tw:rounded-lg");
    expect(card.className).toContain("tw:bg-card");
    expect(screen.getByText("Title")).toBeInTheDocument();
  });

  it("renders CardSection with an accessible name", () => {
    render(<CardSection title="Members">Rows</CardSection>);
    expect(screen.getByRole("region", { name: "Members" })).toBeInTheDocument();
  });
});

describe("centralized search and filter", () => {
  it("edits through SearchInput with an accessible label", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = React.useState("");
      return (
        <>
          <SearchInput value={value} onChange={setValue} label="Search members" />
          <output aria-label="current">{value}</output>
        </>
      );
    }
    render(<Harness />);
    await user.type(screen.getByLabelText("Search members"), "ana");
    expect(screen.getByLabelText("current")).toHaveTextContent("ana");
  });

  it("renders FilterBar search and select filters", async () => {
    const user = userEvent.setup();
    let search = "";
    let status = "all";
    render(
      <FilterBar
        search={search}
        onSearch={(next) => (search = next)}
        searchLabel="Search items"
        filters={[{ label: "Status", value: status, onChange: (next) => (status = next), options: [{ value: "all", label: "All" }] }]}
      />,
    );
    await user.type(screen.getByLabelText("Search items"), "x");
    expect(search).toBe("x");
    expect(status).toBe("all");
  });
});

describe("centralized feedback", () => {
  function Runner({ action, success }: { action: () => Promise<unknown>; success: string }) {
    const run = useActionRunner();
    return <Button onClick={() => void run(action, success)}>Go</Button>;
  }

  it("reports success and failure through toasts", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <>
        <AppToaster />
        <Runner action={() => Promise.resolve()} success="Saved." />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Go" }));
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    unmount();
    cleanup();
    toast.dismiss();

    const failing = vi.fn().mockRejectedValue(new Error("Blocked."));
    render(
      <>
        <AppToaster />
        <Runner action={failing} success="Saved." />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Go" }));
    expect(await screen.findByText("Blocked.")).toBeInTheDocument();
  });

  it("exposes notify helpers", async () => {
    render(<AppToaster />);
    notify.success("Done");
    expect(await screen.findByText("Done")).toBeInTheDocument();
  });

  it("collects a reason in ReasonDialog and submits FormDialog", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <ReasonDialog open title="Remove?" description="Why?" successText="Removed." onClose={onClose} onSubmit={onSubmit} />,
    );
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(screen.getByText("Reason is required.")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/reason/i), "Duplicate");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("Duplicate"));

    const submit = vi.fn();
    render(
      <FormDialog open title="Edit" submitText="Save" onClose={() => {}} onSubmit={submit}>
        Body
      </FormDialog>,
    );
    await user.click(screen.getAllByRole("button", { name: "Save" })[0]);
    expect(submit).toHaveBeenCalled();
  });
});

describe("centralized presentation", () => {
  it("renders Money, Section, StatTiles, TabBar, and QueryState", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <Money value={1550000} />
        <Section title="Team" description="Desc" actions={<button type="button">Add</button>}>
          Body
        </Section>
        <StatTiles items={[{ label: "Total", value: "3" }]} />
        <TabBar tabs={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} value="a" onChange={onChange} label="Views" />
        <QueryState isLoading={false} error={null}>
          Loaded
        </QueryState>
      </>,
    );
    expect(screen.getByText(/15,500/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Team" })).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "B" }));
    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.getByText("Loaded")).toBeInTheDocument();
  });

  it("keeps badge vocabularies stable", () => {
    render(
      <>
        <BizBadge status="on_hold" />
        <DesignationBadge designation="SVD" />
        <RoleBadge roleId="role-hr-staff" label="HR Staff" />
      </>,
    );
    expect(screen.getByText("On hold")).toBeInTheDocument();
    expect(screen.getByText("SVD")).toBeInTheDocument();
    expect(screen.getByText("HR Staff")).toBeInTheDocument();
    expect(formatDate("2026-11-09")).toContain("2026");
    expect(formatDate(null)).toBe("—");
  });

  it("supports non-paginated DataTable for short history tables", () => {
    type Row = { id: string; name: string };
    const columns: ColumnDef<Row, unknown>[] = [{ id: "name", header: "Name", cell: ({ row }) => row.original.name }];
    const data = Array.from({ length: 25 }, (_, index) => ({ id: `r${index}`, name: `N${index}` }));
    render(<DataTable data={data} columns={columns} getRowId={(row) => row.id} emptyText="-" paginate={false} caption="History" />);
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
    expect(document.querySelectorAll("tbody tr")).toHaveLength(25);
  });

  it("exposes semantic button aliases with identical styling", () => {
    render(
      <>
        <Button variant="primary">Primary</Button>
        <Button variant="danger">Danger</Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "Primary" }).className).toContain("tw:bg-primary");
    expect(screen.getByRole("button", { name: "Danger" }).className).toContain("tw:text-destructive");
  });
});
