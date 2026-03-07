import * as React from "react";
import { cn } from "./utils";

interface SectionProps extends React.ComponentProps<"section"> {
  title?: string;
  /** 제목 아래에 표시할 설명 (작은 글씨) */
  description?: string;
  /** 헤더 오른쪽에 표시할 액션 (예: 더보기 버튼) */
  headerAction?: React.ReactNode;
  /** 제목 정렬 (기본: left) */
  titleAlign?: "left" | "center";
  spacing?: "sm" | "md" | "lg";
}

const spacingClasses = {
  sm: "space-y-3",
  md: "space-y-4",
  lg: "space-y-6",
};

export function Section({ title, description, headerAction, titleAlign = "left", spacing = "md", className, children, ...props }: SectionProps) {
  const isCenter = titleAlign === "center";
  return (
    <section className={cn(spacingClasses[spacing], className)} {...props}>
      {(title || headerAction) && (
        <div className={cn("mb-4", isCenter && "flex flex-col items-center text-center")}>
          <div className={cn(
            "w-full",
            !isCenter && "flex items-center justify-between gap-3"
          )}>
            {title && (
              <h2 className={cn(
                "text-[15px] font-semibold text-foreground tracking-tight",
                isCenter && "block"
              )}>{title}</h2>
            )}
            {!isCenter && headerAction}
          </div>
          {description && (
            <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

