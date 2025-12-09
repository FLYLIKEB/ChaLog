import * as React from "react";
import { cn } from "./utils";

interface SectionProps extends React.ComponentProps<"section"> {
  title?: string;
  spacing?: "sm" | "md" | "lg";
}

const spacingClasses = {
  sm: "space-y-3",
  md: "space-y-4",
  lg: "space-y-6",
};

export function Section({ title, spacing = "md", className, children, ...props }: SectionProps) {
  return (
    <section className={cn(spacingClasses[spacing], className)} {...props}>
      {title && (
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
      )}
      {children}
    </section>
  );
}

