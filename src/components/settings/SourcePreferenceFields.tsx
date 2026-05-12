import { Checkbox } from "@/components/ui/Checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/components/ui/field";

type SourceOption = {
  value: string;
  label: string;
};

interface SourcePreferenceFieldsProps {
  sources: SourceOption[];
  favoriteSource: string;
  alwaysRefresh: boolean;
  onFavoriteSourceChange: (value: string) => void;
  onAlwaysRefreshChange: (value: boolean) => void;
}

export default function SourcePreferenceFields({
  sources,
  favoriteSource,
  alwaysRefresh,
  onFavoriteSourceChange,
  onAlwaysRefreshChange,
}: SourcePreferenceFieldsProps) {
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel htmlFor="source-select" className="mb-2">
          Favourite Source
        </FieldLabel>
        <Select
          value={favoriteSource || "__default__"}
          onValueChange={(value) =>
            onFavoriteSourceChange(value === "__default__" ? "" : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="(default)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__default__">(default)</SelectItem>
            {sources.map((source) => (
              <SelectItem key={source.value} value={source.value}>
                {source.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Select which source to prioritise first
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="always-refresh"
          checked={alwaysRefresh}
          onCheckedChange={(checked) => {
            onAlwaysRefreshChange(Boolean(checked));
          }}
        />
        <FieldLabel htmlFor="always-refresh" className="cursor-pointer">
          Always refresh sources on startup
        </FieldLabel>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        (Default is off, not reccomended unless you have issues with stale data)
      </p>
    </div>
  );
}
