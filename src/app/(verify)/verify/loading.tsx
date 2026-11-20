import { PublicFormPageSkeleton, PublicSectionSkeleton } from "@/panels/public/components/public-skeletons";

export default function Loading() {
  return (
    <div className="site-home">
      <PublicFormPageSkeleton fields={1} topSpacing />
      <PublicSectionSkeleton cards={1} />
    </div>
  );
}
