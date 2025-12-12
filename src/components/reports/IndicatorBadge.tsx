import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { MiniSparkline } from "./MiniSparkline";

interface IndicatorBadgeProps {
  title: string;
  value: string;
  status: "success" | "warning" | "danger" | "neutral";
  trend?: "up" | "down" | "stable";
  tooltip?: string; // Mantido como opcional, mas não usado internamente
  sparklineData?: number[];
  icon?: ReactNode;
  className?: string;
  trendLabel?: string; // Adicionado trendLabel
}

export function IndicatorBadge({
  title,
  value,
  status,
  trend,
  sparklineData,
  icon,
  className,
  trendLabel, // Recebido aqui
}: IndicatorBadgeProps) {
  const statusStyles = {
    success: {
      bg: "bg-success/20 border-success/40",
      text: "text-success",
      sparkline: "hsl(var(--success))", // CORRIGIDO: Usando variável CSS
    },
    warning: {
      bg: "bg-warning/20 border-warning/40",
      text: "text-warning",
      sparkline: "hsl(var(--warning))", // CORRIGIDO: Usando variável CSS
    },
    danger: {
      bg: "bg-destructive/20 border-destructive/40",
      text: "text-destructive",
      sparkline: "hsl(var(--destructive))", // CORRIGIDO: Usando variável CSS
    },
    neutral: {
      bg: "bg-primary/20 border-primary/40",
      text: "text-primary",
      sparkline: "hsl(var(--primary))", // CORRIGIDO: Usando variável CSS
    },
  };

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
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
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"
            )}>
              <TrendIcon className="w-3.5 h-3.5" />
              {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
            </div>
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
  );
}