import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline";

type SharedProps = {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
};

type ButtonProps = SharedProps &
  (
    | ({ href: string } & Omit<ComponentPropsWithoutRef<typeof Link>, "href">)
    | ComponentPropsWithoutRef<"button">
  );

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[linear-gradient(135deg,#4d29c8,#6645d6)] text-white shadow-sm hover:brightness-[1.02]",
  secondary:
    "bg-[#f4effd] text-[#4d29c8] hover:bg-surface-panel-strong",
  outline:
    "border border-border-subtle bg-white text-foreground hover:bg-surface-panel",
};

const baseClasses =
  "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:pointer-events-none disabled:opacity-60";

export function Button(props: ButtonProps) {
  const variant = props.variant ?? "primary";

  if ("href" in props) {
    const { className, children, href, ...rest } = props;
    delete (rest as { variant?: ButtonVariant }).variant;

    return (
      <Link
        href={href}
        className={cn(baseClasses, variantClasses[variant], className)}
        {...rest}
      >
        {children}
      </Link>
    );
  }

  const { className, children, type, ...rest } = props;
  delete (rest as { variant?: ButtonVariant }).variant;

  return (
    <button
      type={type ?? "button"}
      className={cn(baseClasses, variantClasses[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
}
