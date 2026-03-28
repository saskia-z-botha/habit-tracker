import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full px-3.5 py-2.5 rounded-xl border border-pink-200 bg-pink-50 text-pink-900 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition text-sm",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
