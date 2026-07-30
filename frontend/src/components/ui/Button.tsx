"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";
    
    const variants = {
      default: "bg-primary text-on-primary shadow-sm hover:bg-primary/90",
      destructive: "bg-error text-on-error shadow-sm hover:bg-error/90",
      outline: "border border-outline-variant bg-surface-container-lowest shadow-sm hover:bg-surface-container-low text-on-surface",
      secondary: "bg-surface-container text-on-surface shadow-sm hover:bg-surface-container-high",
      ghost: "hover:bg-surface-container-low text-on-surface-variant",
      link: "text-primary underline-offset-4 hover:underline",
    };

    const sizes = {
      default: "h-12 px-4 py-2", // Minimum touch target 48px equivalent
      sm: "h-10 rounded-lg px-3 text-xs",
      lg: "h-14 rounded-2xl px-8 text-base",
      icon: "h-12 w-12",
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
