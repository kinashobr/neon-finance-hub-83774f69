import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MiniSparkline } from "./MiniSparkline";

interface IndicatorBadgeProps {
  title: string;
  value: string;
  status: "success" | "warning" | "danger" | "neutral";
  trend?: "up" | "down" | "stable";
  tooltip: string;
  sparklineData?: number[];
  icon?: ReactNode;
  className?: string;
}

export function IndicatorBadge({
  title,
  value,
  status,
  trend,
  tooltip,
  sparklineData,
  icon,
  className,
}: IndicatorBadgeProps) {
  const statusStyles = {
    success: {
      bg: "bg-success/10 border-success/30",
      text: "text-success",
      sparkline: "hsl(142, 76%, 36%)",
    },
    warning: {
      bg: "bg-warning/10 border-warning/30",
      text: "text-warning",
      sparkline: "hsl(38, 92%, 50%)",
    },
    danger: {
      bg: "bg-destructive/10 border-destructive/30",
      text: "text-destructive",
      sparkline: "hsl(0, 72%, 51%)",
    },
    neutral: {
      bg: "bg-primary/10 border-primary/30",
      text: "text-primary",
      sparkline: "hsl(199, 89%, 48%)",
    },
  };

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "glass-card p-4 border transition-all hover:scale-[1.02] cursor-help",
              statusStyles[status].bg,
              className
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                {icon && <div className={cn("text-sm", statusStyles[status].text)}>{icon}</div>}
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {title}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {trend && (
                  <TrendIcon
                    className={cn(
                      "w-3.5 h-3.5",
                      trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"
                    )}
                  />
                )}
                <Info className="w-3 h-3 text-muted-foreground/50" />
              </div>
            </div>
            <div className="flex items-end justify-between gap-2">
              <span className={cn("text-xl font-bold", statusStyles[status].text)}>
                {value}
              </span>
              {sparklineData && sparklineData.length > 1 && (
                <MiniSparkline
                  data={sparklineData}
                  color={statusStyles[status].sparkline}
                  width={50}
                  height={20}
                />
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs bg-popover border-border p-3">
          <p className="text-sm">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
