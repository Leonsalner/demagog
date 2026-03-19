"use client";

import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FooterHelperTriggerProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: ReactNode;
  iconClassName?: string;
  isExpandedByDefault?: boolean;
  isExpandedWhenActive?: boolean;
  label: string;
}

export const FooterHelperTrigger = forwardRef<HTMLButtonElement, FooterHelperTriggerProps>(
  function FooterHelperTrigger(
    {
      className,
      disabled,
      icon,
      iconClassName,
      isExpandedByDefault = false,
      isExpandedWhenActive = false,
      label,
      onBlur,
      onFocus,
      onMouseEnter,
      onMouseLeave,
      type = "button",
      ...props
    },
    ref,
  ) {
    const [isHovering, setIsHovering] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const isExpanded =
      isExpandedByDefault || isExpandedWhenActive || isHovering || isFocused;

    return (
      <button
        {...props}
        ref={ref}
        type={type}
        disabled={disabled}
        onMouseEnter={(event) => {
          setIsHovering(true);
          onMouseEnter?.(event);
        }}
        onMouseLeave={(event) => {
          setIsHovering(false);
          onMouseLeave?.(event);
        }}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        className={cn(
          "pointer-events-auto inline-flex h-11 items-center rounded-full border border-slate-200 bg-white/96 text-sm font-semibold text-slate-700 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.45)] backdrop-blur transition-[width,padding,border-color,color,box-shadow,background-color] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-900/96 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white",
          isExpanded ? "px-4" : "w-11 justify-center px-0",
          className,
        )}
      >
        <span
          className={cn(
            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm",
            iconClassName,
          )}
        >
          {icon}
        </span>
        <span
          aria-hidden={!isExpanded}
          className={cn(
            "overflow-hidden whitespace-nowrap text-left transition-[max-width,opacity,transform,margin] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            isExpanded
              ? "ml-2 max-w-[12rem] translate-x-0 opacity-100"
              : "ml-0 max-w-0 translate-x-1 opacity-0",
          )}
        >
          {label}
        </span>
      </button>
    );
  },
);
