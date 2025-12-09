import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "./utils";

interface StatCardProps extends React.ComponentProps<"div"> {
  icon: LucideIcon;
  value: string | number;
  label: string;
}

export function StatCard({ icon: Icon, value, label, className, ...props }: StatCardProps) {
  // NaN 체크 및 안전한 값 변환
  const displayValue = typeof value === 'number' && isNaN(value) ? 0 : value;
  
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-3 rounded-lg bg-card/50 border border-border/50",
        className
      )}
      {...props}
    >
      <Icon className="w-4 h-4 text-muted-foreground mb-1.5" />
      <div className="text-lg font-semibold text-foreground mb-0.5">{displayValue}</div>
      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</div>
    </div>
  );
}

