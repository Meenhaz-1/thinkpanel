"use client";

import Image from "next/image";
import { useState } from "react";

import { getInitials, getPersonaAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

type PersonaAvatarSize = "sm" | "md" | "lg";

type PersonaAvatarProps = {
  name: string;
  size?: PersonaAvatarSize;
  className?: string;
};

const sizeClasses: Record<PersonaAvatarSize, string> = {
  sm: "h-10 w-10 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-base",
};

export function PersonaAvatar({
  name,
  size = "md",
  className,
}: PersonaAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const safeName = name.trim() || "Persona";

  if (hasError) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-panel text-sm font-semibold text-primary",
          sizeClasses[size],
          className,
        )}
        aria-label={`${safeName} avatar`}
      >
        {getInitials(safeName)}
      </div>
    );
  }

  return (
    <Image
      src={getPersonaAvatarUrl(safeName)}
      alt={`${safeName} avatar`}
      width={64}
      height={64}
      unoptimized
      className={cn(
        "shrink-0 rounded-full border border-border-subtle bg-surface-panel object-cover",
        sizeClasses[size],
        className,
      )}
      onError={() => setHasError(true)}
    />
  );
}
