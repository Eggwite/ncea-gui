import { cn } from "@/lib/utils";

export function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: "asc" | "desc";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "ml-1 text-[0.65rem] transition-opacity",
        active ? "opacity-100" : "opacity-30",
      )}
    >
      {direction === "asc" ? "↑" : "↓"}
    </span>
  );
}
