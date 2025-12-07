import { cn } from "@/lib/utils";

interface IndicatorCardProps {
  label: string;
  value: string;
  description?: string;
  status: "good" | "warning" | "danger";
  delay?: number;
}

export function IndicatorCard({
  label,
  value,
  description,
  status,
  delay = 0,
}: IndicatorCardProps) {
  const statusStyles = {
    good: "border-success/50 bg-success/5",
    warning: "border-warning/50 bg-warning/5",
    danger: "border-destructive/50 bg-destructive/5",
  };

  const statusDotStyles = {
    good: "bg-success",
    warning: "bg-warning",
    danger: "bg-destructive",
  };

  return (
    <div
      className={cn(
        "p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] animate-fade-in-up",
        statusStyles[status]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            statusDotStyles[status]
          )}
        />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}
