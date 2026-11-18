import { PublicFormPageSkeleton, PublicHeroSkeleton, PublicSectionSkeleton } from "@/panels/public/components/public-skeletons";

export default function Loading() {
  return (
    <div className="site-home">
      <PublicHeroSkeleton media={false} />
      <PublicFormPageSkeleton fields={1} />
      <PublicSectionSkeleton cards={2} />
    </div>
  );
}
