import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "./alert-dialog";
import { Toaster } from "./sonner";

afterEach(cleanup);

describe("shadcn on Base UI primitives", () => {
  it("renders an accessible Button and a labelled Input", async () => {
    const user = userEvent.setup();
    let clicked = 0;
    render(
      <>
        <Label htmlFor="field-name">Name</Label>
        <Input id="field-name" />
        <Button onClick={() => (clicked += 1)}>Save</Button>
      </>,
    );
    await user.type(screen.getByLabelText("Name"), "Ana");
    expect(screen.getByLabelText("Name")).toHaveValue("Ana");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(clicked).toBe(1);
  });

  it("opens a Dialog with focus inside, closes on Escape, and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger render={<Button>Open</Button>} />
        <DialogContent>
          <DialogTitle>Details</DialogTitle>
          <DialogDescription>Body</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog", { name: "Details" });
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();
  });

  it("exposes AlertDialog as an alertdialog that does not run its action when cancelled", async () => {
    const user = userEvent.setup();
    let confirmed = 0;
    render(
      <AlertDialog>
        <AlertDialogTrigger render={<Button>Remove</Button>} />
        <AlertDialogContent>
          <AlertDialogTitle>Remove item?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => (confirmed += 1)}>Remove</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await user.click(screen.getByRole("button", { name: "Remove" }));
    await screen.findByRole("alertdialog", { name: "Remove item?" });
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(confirmed).toBe(0);
  });

  it("renders the Toaster host without visible content until a toast is raised", () => {
    const { container } = render(<Toaster />);
    expect(container.textContent).toBe("");
  });
});

describe("tw prefix keeps utilities from colliding with unmigrated class names", () => {
  it("prefixes the shadcn configuration and every generated component class", () => {
    const config = JSON.parse(readFileSync(join(process.cwd(), "components.json"), "utf8"));
    expect(config.tailwind.prefix).toBe("tw");
    const button = readFileSync(join(process.cwd(), "src/shared/ui/button.tsx"), "utf8");
    expect(button).toContain("tw:inline-flex");
    expect(button).not.toContain('"inline-flex ');
  });

  it("renders prefixed utility classes on primitives", () => {
    render(<Button>Go</Button>);
    const classes = screen.getByRole("button", { name: "Go" }).className.split(" ");
    expect(classes).toContain("tw:inline-flex");
    expect(classes).not.toContain("inline-flex");
  });
});

describe("global stylesheet contract", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  it("keeps Tailwind in named layers with prefixed utilities and preflight in the base layer", () => {
    expect(css).toMatch(/@layer theme, base, components, utilities;/);
    expect(css).toContain('@import "tailwindcss/theme.css" layer(theme) prefix(tw);');
    expect(css).toContain('@import "tailwindcss/preflight.css" layer(base);');
    expect(css).toContain('@import "tailwindcss/utilities.css" layer(utilities) prefix(tw);');
    expect(css).not.toMatch(/@import "tailwindcss";/);
  });

  it("imports the corporate tokens and binds dark: variants to a .dark ancestor only", () => {
    expect(css).toContain('@import "../theme/tokens.css";');
    expect(css).toContain("@custom-variant dark (&:is(.dark *));");
  });

  it("defines every shadcn variable that the Tailwind theme maps", () => {
    const theme = css.slice(css.indexOf("@theme inline"), css.indexOf("}", css.indexOf("@theme inline")));
    const referenced = [...theme.matchAll(/var\(--([a-z-]+)\)/g)].map((match) => match[1]).filter((name) => !name.startsWith("font-geist") && name !== "radius");
    const rootStart = css.indexOf(":root {");
    const root = css.slice(rootStart, css.indexOf("\n}", rootStart));
    for (const name of new Set(referenced)) expect(root, `--${name}`).toContain(`--${name}:`);
  });
});
