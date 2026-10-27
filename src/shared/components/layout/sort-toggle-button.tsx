import { Button } from "antd";

/** Shared A–Z / Z–A sort toggle used by the organization directory pages. */
export function SortToggleButton({ ascending, onToggle }: { ascending: boolean; onToggle: () => void }) {
  return (
    <Button onClick={onToggle} aria-label={ascending ? "Sort A-Z" : "Sort Z-A"} className="sort-toggle-button">
      {ascending ? "Sort A-Z" : "Sort Z-A"}
    </Button>
  );
}
