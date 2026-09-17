import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { renderApp } from "@/app/test-utils";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { Tooltip } from "@/components/ui/Tooltip";
import { PREFERENCES_STORAGE_KEY } from "@/lib/preferences";
import { mockApi } from "./helpers";

beforeEach(() => {
  vi.stubGlobal("fetch", mockApi({}));
});

test("primary buttons are distinguishable from secondary and danger", () => {
  render(
    <div>
      <Button>Save</Button>
      <Button variant="secondary">Cancel</Button>
      <Button variant="danger">Delete</Button>
      <Button variant="ghost">Quiet</Button>
    </div>,
  );
  expect(screen.getByRole("button", { name: "Save" })).toHaveClass("bg-ink");
  expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass("bg-surface");
  expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("bg-danger");
  expect(screen.getByRole("button", { name: "Quiet" })).toHaveClass("border-transparent");
});

test("button loading announces busy state and disables the control", () => {
  render(<Button loading>Creating</Button>);
  const button = screen.getByRole("button", { name: "Creating" });
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute("aria-busy", "true");
});

test("input errors are associated with the field", () => {
  render(<Input id="dataset-name" label="Name" error="Enter a name" />);
  const field = screen.getByLabelText("Name");
  expect(field).toHaveAttribute("aria-invalid", "true");
  expect(field).toHaveAccessibleDescription("Enter a name");
  expect(screen.getByRole("alert")).toHaveTextContent("Enter a name");
});

test("dialog traps focus and restores it on escape", async () => {
  const user = userEvent.setup();
  function Host() {
    const [open, setOpen] = useState(true);
    return (
      <div>
        <button type="button">Before</button>
        <Dialog
          open={open}
          title="Rename dataset"
          onClose={() => {
            setOpen(false);
          }}
        >
          <DialogHeader
            title="Rename dataset"
            description="The original file is unchanged."
          />
          <DialogBody>
            <button type="button">Inside</button>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary">Cancel</Button>
          </DialogFooter>
        </Dialog>
      </div>
    );
  }
  render(<Host />);
  expect(screen.getByRole("dialog", { name: "Rename dataset" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Inside" })).toHaveFocus();
  await user.keyboard("{Escape}");
  expect(
    screen.queryByRole("dialog", { name: "Rename dataset" }),
  ).not.toBeInTheDocument();
});

test("tooltip remains available from hover and focus", async () => {
  const user = userEvent.setup();
  render(
    <Tooltip label="Expand navigation">
      <button type="button">Collapse</button>
    </Tooltip>,
  );
  await user.hover(screen.getByRole("button", { name: "Collapse" }));
  expect(screen.getByRole("tooltip")).toHaveTextContent("Expand navigation");
});

test("page header uses the page title role and optional description", () => {
  render(
    <PageHeader
      title="Datasets"
      description="CSV, Excel, or JSON."
      actions={<Button>Upload a file</Button>}
    />,
  );
  expect(screen.getByRole("heading", { name: "Datasets" })).toBeInTheDocument();
  expect(screen.getByText("CSV, Excel, or JSON.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Upload a file" })).toBeInTheDocument();
});

test("technical details stay collapsed until opened", async () => {
  const user = userEvent.setup();
  render(
    <TechnicalDetails>
      <p>job_id: abc</p>
    </TechnicalDetails>,
  );
  expect(screen.getByText("Technical details")).toBeInTheDocument();
  expect(screen.getByText("job_id: abc")).not.toBeVisible();
  await user.click(screen.getByText("Technical details"));
  expect(screen.getByText("job_id: abc")).toBeVisible();
});

test("mobile navigation opens, closes on escape, and restores focus", async () => {
  const user = userEvent.setup();
  renderApp(["/overview"]);
  const trigger = screen.getByRole("button", { name: "Open navigation" });
  await user.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: "Navigation" });
  expect(dialog).toBeInTheDocument();
  expect(
    within(dialog).queryByRole("button", { name: /collapse navigation/i }),
  ).not.toBeInTheDocument();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog", { name: "Navigation" })).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

test("reduced motion preference zeroes duration tokens", async () => {
  const user = userEvent.setup();
  renderApp(["/settings"]);
  await user.click(await screen.findByRole("radio", { name: "Reduced" }));
  expect(document.documentElement.dataset.motion).toBe("reduced");
  const stored = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? "{}") as {
    motion?: string;
  };
  expect(stored.motion).toBe("reduced");
});
