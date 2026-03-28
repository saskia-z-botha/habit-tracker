"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-pink-900/20 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className={cn(
          "relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6",
          className
        )}
      >
        {(title || true) && (
          <div className="flex items-center justify-between mb-5">
            {title && (
              <h2 className="text-base font-semibold text-pink-900">{title}</h2>
            )}
            <button
              onClick={onClose}
              className="ml-auto p-1.5 rounded-lg hover:bg-pink-50 text-pink-400 hover:text-pink-600 transition"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
