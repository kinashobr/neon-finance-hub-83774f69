import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  variant?: "positive" | "negative" | "neutral";
  className?: string;
  delay?: number;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  variant = "neutral",
  className,
  delay = 0,
}: StatCardProps) {
  const TrendIcon = change && change > 0 ? TrendingUp : change && change < 0 ? TrendingDown : Minus;
  
  const variantStyles = {
    positive: "stat-card-positive",
    negative: "stat-card-negative",
    neutral: "stat-card-neutral",
  };

  const iconBgStyles = {
    positive: "bg-success/10 text-success",
    negative: "bg-destructive/10 text-destructive",
    neutral: "bg-primary/10 text-primary",
  };

  return (
    <div
      className={cn(
        "glass-card p-5 animate-fade-in-up",
        variantStyles[variant],
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <TrendIcon
                className={cn(
                  "w-4 h-4",
                  change > 0 ? "text-success" : change < 0 ? "text-destructive" : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "text-sm font-medium",
                  change > 0 ? "text-success" : change < 0 ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {change > 0 ? "+" : ""}
                {change}%
              </span>
              {changeLabel && (
                <span className="text-xs text-muted-foreground ml-1">
                  {changeLabel}
                </span>
              )}
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", iconBgStyles[variant])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
