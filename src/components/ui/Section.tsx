import * as React from "react";
import { cn } from "./utils";

interface SectionProps extends React.ComponentProps<"section"> {
  title?: string;
  /** 제목 아래에 표시할 설명 (작은 글씨) */
  description?: string;
  /** 헤더 오른쪽에 표시할 액션 (예: 더보기 버튼) */
  headerAction?: React.ReactNode;
  spacing?: "sm" | "md" | "lg";
}

const spacingClasses = {
  sm: "space-y-3",
  md: "space-y-4",
  lg: "space-y-6",
};

export function Section({ title, description, headerAction, spacing = "md", className, children, ...props }: SectionProps) {
  return (
    <section className={cn(spacingClasses[spacing], className)} {...props}>
      {(title || headerAction) && (
        <div className="mb-4">
          <div className="flex items-center justify-between gap-3">
            {title && <h2 className="text-lg font-semibold text-foreground tracking-tight">{title}</h2>}
            {headerAction}
          </div>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

