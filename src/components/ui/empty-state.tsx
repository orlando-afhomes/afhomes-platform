import { cn } from "@/lib/utils";

function EmptyState({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-state"
      className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-8 text-center", className)}
      {...props}
    />
  );
}

export { EmptyState };
