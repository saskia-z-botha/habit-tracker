import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed",
          {
            "bg-pink-300 hover:bg-pink-400 text-pink-900": variant === "primary",
            "bg-pink-100 hover:bg-pink-200 text-pink-700": variant === "secondary",
            "hover:bg-pink-50 text-pink-600": variant === "ghost",
            "bg-rose-100 hover:bg-rose-200 text-rose-700": variant === "danger",
          },
          {
            "text-xs px-3 py-1.5 gap-1.5": size === "sm",
            "text-sm px-4 py-2.5 gap-2": size === "md",
            "text-base px-5 py-3 gap-2": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
