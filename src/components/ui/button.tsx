"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline";

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-[#e03e1a] text-white shadow-sm hover:bg-[#c73414] dark:bg-[#ff3300] dark:hover:bg-[#e63a00]",
  outline:
    "border border-slate-300/90 bg-white/90 text-slate-600 shadow-sm hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-full text-sm font-medium transition active:scale-95 disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";

export { Button };
