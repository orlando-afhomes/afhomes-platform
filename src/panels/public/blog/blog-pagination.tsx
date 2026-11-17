import { ChevronLeft, ChevronRight } from "lucide-react";

/** Page numbers to show: all when there are 7 or fewer, otherwise first, last and the current page with its neighbours. */
function pageItems(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  let start = Math.max(2, Math.min(page - 1, pageCount - 2));
  let end = Math.min(pageCount - 1, Math.max(page + 1, 3));
  // A gap that would hide a single page shows that page instead.
  if (start === 3) start = 2;
  if (end === pageCount - 2) end = pageCount - 1;
  const items: (number | "gap")[] = [1];
  if (start > 2) items.push("gap");
  for (let n = start; n <= end; n += 1) items.push(n);
  if (end < pageCount - 1) items.push("gap");
  items.push(pageCount);
  return items;
}

/** Round page buttons under the story grid; changing page scrolls back to the "Latest articles" block. */
export function BlogPagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (page: number) => void }) {
  function go(next: number) {
    if (next < 1 || next > pageCount || next === page) return;
    onChange(next);
    document.getElementById("latest")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="blog-pagination" aria-label="Blog pages">
      <button type="button" className="blog-pagination__button" aria-label="Previous page" disabled={page <= 1} onClick={() => go(page - 1)}>
        <ChevronLeft className="blog-pagination__icon" aria-hidden="true" />
      </button>
      {pageItems(page, pageCount).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="blog-pagination__gap" aria-hidden="true">…</span>
        ) : (
          <button
            key={item}
            type="button"
            className="blog-pagination__button"
            aria-label={`Page ${item}`}
            aria-current={item === page ? "page" : undefined}
            onClick={() => go(item)}
          >
            {item}
          </button>
        ),
      )}
      <button type="button" className="blog-pagination__button" aria-label="Next page" disabled={page >= pageCount} onClick={() => go(page + 1)}>
        <ChevronRight className="blog-pagination__icon" aria-hidden="true" />
      </button>
    </nav>
  );
}
