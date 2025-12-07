import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LoanCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  status?: "success" | "warning" | "danger" | "neutral" | "info";
  icon?: ReactNode;
  tooltip?: string;
  className?: string;
  delay?: number;
  size?: "sm" | "md" | "lg";
}

export function LoanCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  status = "neutral",
  icon,
  tooltip,
  className,
  delay = 0,
  size = "md",
}: LoanCardProps) {
  const statusColors = {
    success: "border-l-success bg-success/5",
    warning: "border-l-warning bg-warning/5",
    danger: "border-l-destructive bg-destructive/5",
    neutral: "border-l-primary bg-primary/5",
    info: "border-l-neon-cyan bg-neon-cyan/5",
  };

  const statusTextColors = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    neutral: "text-primary",
    info: "text-neon-cyan",
  };

  const sizeClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-5",
  };

  const valueSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;

  const content = (
    <div
      className={cn(
        "glass-card border-l-4 animate-fade-in-up transition-all hover:scale-[1.02]",
        statusColors[status],
        sizeClasses[size],
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
            {title}
          </p>
          <p className={cn("font-bold mt-1", valueSizes[size], statusTextColors[status])}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 mt-1.5 text-xs font-medium",
              trend > 0 ? "text-success" : trend < 0 ? "text-destructive" : "text-muted-foreground"
            )}>
              <TrendIcon className="w-3 h-3" />
              <span>{trend > 0 ? "+" : ""}{trend.toFixed(1)}%</span>
              {trendLabel && <span className="text-muted-foreground">vs {trendLabel}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className={cn(
            "p-2 rounded-lg shrink-0",
            status === "success" && "bg-success/10 text-success",
            status === "warning" && "bg-warning/10 text-warning",
            status === "danger" && "bg-destructive/10 text-destructive",
            status === "neutral" && "bg-primary/10 text-primary",
            status === "info" && "bg-neon-cyan/10 text-neon-cyan"
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent className="max-w-xs bg-popover border-border">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}
