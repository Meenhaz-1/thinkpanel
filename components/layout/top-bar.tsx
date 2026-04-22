"use client";

import { usePathname } from "next/navigation";

function getSegments(pathname: string) {
  const cleanedPath = pathname === "/" ? "/dashboard" : pathname;

  if (cleanedPath.startsWith("/evaluations/") && cleanedPath !== "/evaluations/new") {
    return ["Evaluations", "Results"];
  }

  if (cleanedPath === "/personas/new") {
    return ["Personas", "New Persona"];
  }

  if (cleanedPath === "/evaluations/new") {
    return ["Evaluations", "New Evaluation"];
  }

  if (cleanedPath === "/dashboard") {
    return ["Dashboard"];
  }

  return ["Persona Panel"];
}

export function TopBar() {
  const pathname = usePathname();
  const segments = getSegments(pathname);

  return (
    <div className="sticky top-0 z-20 border-b border-border-subtle bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4 md:px-8">
        {segments.map((segment, index) => (
          <div key={`${segment}-${index}`} className="flex items-center gap-3">
            {index > 0 ? (
              <span className="text-sm text-muted-foreground">/</span>
            ) : null}
            <span
              className={
                index === segments.length - 1
                  ? "font-medium text-foreground"
                  : "text-sm text-muted-foreground"
              }
            >
              {segment}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
