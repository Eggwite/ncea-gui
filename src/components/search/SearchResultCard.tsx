import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { SearchStandard, PapersProgress } from "../../types";

interface SearchResultCardProps {
  result: SearchStandard;
  isSelecting: boolean;
  papersProgress: PapersProgress | null;
  onSelect: (std: SearchStandard) => void;
}

const LEVEL_COLORS: Record<string, string> = {
  "1": "text-blue-400",
  "2": "text-emerald-400",
  "3": "text-violet-400",
  scholarship: "text-amber-400",
};

export default function SearchResultCard({
  result: r,
  isSelecting,
  papersProgress,
  onSelect,
}: SearchResultCardProps) {
  const levelLabel = r.level === "scholarship" ? "Schol" : `L${r.level}`;
  const levelColor = LEVEL_COLORS[r.level] ?? "text-muted-foreground";

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div
          onClick={() => onSelect(r)}
          className={`group relative flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-3 cursor-pointer transition-all hover:border-border hover:bg-muted/30 overflow-hidden ${
            isSelecting ? "opacity-60" : ""
          }`}
        >
          <span
            className={`text-xs font-semibold font-mono shrink-0 ${levelColor}`}
          >
            {levelLabel}
          </span>

          <h3 className="flex-1 min-w-0 text-sm font-medium leading-tight truncate text-foreground/80 group-hover:text-foreground transition-colors">
            {r.title}
          </h3>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="text-xs opacity-50">
              {r.subject}
            </Badge>
            <span className="text-xs font-mono text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors">
              {r.standardId}
            </span>
          </div>

          {isSelecting && papersProgress && (
            <div className="absolute inset-x-0 bottom-0">
              <Progress
                value={(papersProgress.completed / papersProgress.total) * 100}
                className="h-0.5 rounded-none"
              />
            </div>
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-80"
        // @ts-expect-error openDelay missing from types
        openDelay={300}
        closeDelay={100}
      >
        <div className="space-y-1">
          <p className={`text-xs font-semibold font-mono ${levelColor}`}>
            {levelLabel}
          </p>
          <h4 className="font-semibold text-sm">{r.title}</h4>
          <p className="text-xs text-muted-foreground">{r.subject}</p>
          {r.level !== "scholarship" && r.credits !== undefined && (
            <p className="text-xs text-muted-foreground">{r.credits} credits</p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
