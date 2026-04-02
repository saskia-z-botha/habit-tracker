import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  // Use UTC values to avoid timezone shifting
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function toDateString(date: Date): string {
  // Always use UTC date to stay consistent
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Returns today's date in YYYY-MM-DD format in the America/Los_Angeles timezone (PST/PDT).
// Use this on the server wherever "today" means the user's local calendar day.
export function localDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(date);
}

export function fromDateString(dateStr: string): Date {
  return new Date(dateStr + "T12:00:00Z");
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return toDateString(date) === toDateString(today);
}

export function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return toDateString(date) === toDateString(yesterday);
}
