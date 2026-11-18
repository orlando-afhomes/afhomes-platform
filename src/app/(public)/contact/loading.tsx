import { PublicFormPageSkeleton, PublicHeroSkeleton, PublicSectionSkeleton } from "@/panels/public/components/public-skeletons";

export default function Loading() {
  return (
    <div className="site-home">
      <PublicHeroSkeleton media={false} />
      <PublicSectionSkeleton cards={2} />
      <PublicFormPageSkeleton fields={4} />
      <PublicSectionSkeleton cards={2} />
    </div>
  );
}
