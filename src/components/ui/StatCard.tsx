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
        "bg-card rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow",
        className
      )}
      {...props}
    >
      <Icon className="w-5 h-5 text-muted-foreground mb-2" />
      <div className="text-2xl font-semibold text-primary">{displayValue}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

