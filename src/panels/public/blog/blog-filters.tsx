import { CalendarDays, Clapperboard, Heart, Leaf, Megaphone, Mountain, Newspaper, type LucideIcon } from "lucide-react";
import type { BlogCategory } from "@/modules/public-site/content/blog";

const CATEGORY_ICONS: Record<BlogCategory, LucideIcon> = {
  "Events & Activities": CalendarDays,
  "Behind the Scenes": Clapperboard,
  "Resort Highlights": Mountain,
  "News & Promos": Megaphone,
  "Eco-Friendly Living": Leaf,
  "Wellness & Relaxation": Heart,
  Blog: Newspaper,
};

/** Row of category chips; "All" shows every post. */
export function BlogFilters({
  categories,
  value,
  onChange,
}: {
  categories: BlogCategory[];
  value: "all" | BlogCategory;
  onChange: (next: "all" | BlogCategory) => void;
}) {
  return (
    <div className="blog-filters" role="group" aria-label="Filter posts by category">
      <button
        type="button"
        className="blog-filters__chip blog-filters__chip--all"
        aria-pressed={value === "all"}
        onClick={() => onChange("all")}
      >
        All
      </button>
      {categories.map((category) => {
        const Icon = CATEGORY_ICONS[category];
        return (
          <button
            key={category}
            type="button"
            className="blog-filters__chip"
            aria-pressed={value === category}
            onClick={() => onChange(category)}
          >
            <Icon className="blog-filters__icon" aria-hidden="true" />
            {category}
          </button>
        );
      })}
    </div>
  );
}
