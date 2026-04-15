import * as React from "react"
import { cn } from "@/src/lib/utils"

export interface BadgeProps extends React.ComponentPropsWithoutRef<"div"> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "danger";
  className?: string;
  children?: React.ReactNode;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-slate-900 text-slate-50 hover:bg-slate-900/80": variant === "default",
          "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80": variant === "secondary",
          "text-slate-950": variant === "outline",
          "border-transparent bg-[var(--color-urgency-normal)]/10 text-[var(--color-urgency-normal)]": variant === "success",
          "border-transparent bg-[var(--color-urgency-warning)]/10 text-[var(--color-urgency-warning)]": variant === "warning",
          "border-transparent bg-[var(--color-urgency-critical)]/10 text-[var(--color-urgency-critical)]": variant === "danger",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
