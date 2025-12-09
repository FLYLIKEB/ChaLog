import * as React from "react";
import { cn } from "./utils";

interface UserAvatarProps extends React.ComponentProps<"div"> {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "w-12 h-12 text-base",
  md: "w-16 h-16 text-lg",
  lg: "w-20 h-20 text-xl",
  xl: "w-24 h-24 text-2xl",
};

export function UserAvatar({ name, size = "md", className, ...props }: UserAvatarProps) {
  const userInitial = (name.charAt(0) || '?').toUpperCase();
  const sizeClass = sizeClasses[size];

  return (
    <div
      data-slot="avatar"
      className={cn(
        "rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold shadow-sm",
        sizeClass,
        className
      )}
      {...props}
    >
      {userInitial}
    </div>
  );
}

