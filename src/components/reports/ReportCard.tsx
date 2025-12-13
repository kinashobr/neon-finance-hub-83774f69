import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";

interface ReportCardProps {
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

export function ReportCard({
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
}: ReportCardProps) {
  const statusClasses = {
    success: "stat-card-positive",
    warning: "stat-card-warning",
    danger: "stat-card-negative",
    neutral: "stat-card-neutral",
    info: "stat-card-info",
  };

  const statusTextColors = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    neutral: "text-primary",
    info: "text-neon-cyan",
  };

  const statusIconBg = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
    neutral: "bg-primary/10 text-primary",
    info: "bg-neon-cyan/10 text-neon-cyan",
  };

  const sizeClasses = {
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
  };

  // Reduzindo o tamanho do valor para garantir que caiba
  const valueSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };
  
  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-7 h-7",
  };

  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;

  const content = (
    <Card 
      className={cn(
        "glass-card animate-fade-in-up transition-all hover:scale-[1.02]",
        statusClasses[status as keyof typeof statusClasses], // Aplica a classe de borda (que já define border-left: 4px)
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className={cn("p-5", sizeClasses[size])}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {/* Removido truncate para evitar corte de título */}
              {title}
            </p>
            <p className={cn("font-bold mt-1 whitespace-nowrap", valueSizes[size], statusTextColors[status])}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
            )}
            {trend !== undefined && (
              <div className={cn(
                "flex items-center gap-1 mt-2 text-sm font-medium whitespace-nowrap",
                trend > 0 ? "text-success" : trend < 0 ? "text-destructive" : "text-muted-foreground"
              )}>
                <TrendIcon className="w-4 h-4" />
                <span>{trend > 0 ? "+" : ""}{trend.toFixed(1)}%</span>
                {trendLabel && <span className="text-muted-foreground text-xs">vs {trendLabel}</span>}
              </div>
            )}
          </div>
          {icon && (
            <div className={cn(
              "p-3 rounded-xl shrink-0 flex items-center justify-center",
              statusIconBg[status]
            )}>
              {/* Renderiza o ícone, assumindo que é um componente Lucide React ou similar */}
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
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