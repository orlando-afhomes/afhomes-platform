import { PublicHeroSkeleton, PublicSectionSkeleton, PublicTierGridSkeleton } from "@/panels/public/components/public-skeletons";

export default function Loading() {
  return (
    <div className="site-home">
      <PublicHeroSkeleton actions media />
      <PublicTierGridSkeleton />
      <PublicSectionSkeleton cards={3} />
    </div>
  );
}
