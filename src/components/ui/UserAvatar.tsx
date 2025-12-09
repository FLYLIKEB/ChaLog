import * as React from "react";
import { cn } from "./utils";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";

interface UserAvatarProps extends React.ComponentProps<"div"> {
  name: string;
  profileImageUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "w-12 h-12 text-base",
  md: "w-16 h-16 text-lg",
  lg: "w-20 h-20 text-xl",
  xl: "w-24 h-24 text-2xl",
};

export function UserAvatar({ name, profileImageUrl, size = "md", className, ...props }: UserAvatarProps) {
  const userInitial = (name.charAt(0) || '?').toUpperCase();
  const sizeClass = sizeClasses[size];
  const [imageError, setImageError] = React.useState(false);

  // profileImageUrl이 변경되면 에러 상태 리셋
  React.useEffect(() => {
    setImageError(false);
  }, [profileImageUrl]);

  const handleImageError = () => {
    setImageError(true);
  };

  // 이미지 URL이 있고 에러가 발생하지 않았을 때만 이미지 표시
  const showImage = profileImageUrl && !imageError;

  return (
    <Avatar
      data-slot="avatar"
      className={cn(sizeClass, className)}
      {...props}
    >
      {showImage && (
        <AvatarImage
          src={profileImageUrl}
          alt={name}
          onError={handleImageError}
          className="object-cover"
        />
      )}
      <AvatarFallback
        className={cn(
          "bg-primary text-primary-foreground font-semibold shadow-sm",
          sizeClass
        )}
      >
        {userInitial}
      </AvatarFallback>
    </Avatar>
  );
}

