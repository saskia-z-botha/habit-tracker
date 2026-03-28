export type ThemeId = "pink" | "purple" | "blue" | "green" | "orange";

export interface Theme {
  id: ThemeId;
  label: string;
  swatch: string; // color-500 for preview dot
  vars: Record<string, string>;
}

export const THEMES: Theme[] = [
  {
    id: "pink",
    label: "Pink",
    swatch: "#ec4899",
    vars: {}, // default — no overrides needed
  },
  {
    id: "purple",
    label: "Purple",
    swatch: "#a855f7",
    vars: {
      "--color-pink-50": "#faf5ff",
      "--color-pink-100": "#f3e8ff",
      "--color-pink-200": "#e9d5ff",
      "--color-pink-300": "#d8b4fe",
      "--color-pink-400": "#c084fc",
      "--color-pink-500": "#a855f7",
      "--color-pink-600": "#9333ea",
      "--color-pink-700": "#7e22ce",
      "--color-pink-900": "#581c87",
      "--color-rose-50": "#fdf4ff",
      "--color-rose-100": "#fae8ff",
      "--color-rose-200": "#f5d0fe",
      "--color-rose-300": "#f0abfc",
      "--color-rose-400": "#e879f9",
      "--color-rose-500": "#d946ef",
      "--color-rose-600": "#c026d3",
    },
  },
  {
    id: "blue",
    label: "Blue",
    swatch: "#3b82f6",
    vars: {
      "--color-pink-50": "#eff6ff",
      "--color-pink-100": "#dbeafe",
      "--color-pink-200": "#bfdbfe",
      "--color-pink-300": "#93c5fd",
      "--color-pink-400": "#60a5fa",
      "--color-pink-500": "#3b82f6",
      "--color-pink-600": "#2563eb",
      "--color-pink-700": "#1d4ed8",
      "--color-pink-900": "#1e3a8a",
      "--color-rose-50": "#f0f9ff",
      "--color-rose-100": "#e0f2fe",
      "--color-rose-200": "#bae6fd",
      "--color-rose-300": "#7dd3fc",
      "--color-rose-400": "#38bdf8",
      "--color-rose-500": "#0ea5e9",
      "--color-rose-600": "#0284c7",
    },
  },
  {
    id: "green",
    label: "Green",
    swatch: "#22c55e",
    vars: {
      "--color-pink-50": "#f0fdf4",
      "--color-pink-100": "#dcfce7",
      "--color-pink-200": "#bbf7d0",
      "--color-pink-300": "#86efac",
      "--color-pink-400": "#4ade80",
      "--color-pink-500": "#22c55e",
      "--color-pink-600": "#16a34a",
      "--color-pink-700": "#15803d",
      "--color-pink-900": "#14532d",
      "--color-rose-50": "#f0fdf4",
      "--color-rose-100": "#dcfce7",
      "--color-rose-200": "#bbf7d0",
      "--color-rose-300": "#86efac",
      "--color-rose-400": "#4ade80",
      "--color-rose-500": "#22c55e",
      "--color-rose-600": "#16a34a",
    },
  },
  {
    id: "orange",
    label: "Peach",
    swatch: "#f97316",
    vars: {
      "--color-pink-50": "#fff7ed",
      "--color-pink-100": "#ffedd5",
      "--color-pink-200": "#fed7aa",
      "--color-pink-300": "#fdba74",
      "--color-pink-400": "#fb923c",
      "--color-pink-500": "#f97316",
      "--color-pink-600": "#ea580c",
      "--color-pink-700": "#c2410c",
      "--color-pink-900": "#7c2d12",
      "--color-rose-50": "#fff1f2",
      "--color-rose-100": "#ffe4e6",
      "--color-rose-200": "#fecdd3",
      "--color-rose-300": "#fda4af",
      "--color-rose-400": "#fb7185",
      "--color-rose-500": "#f43f5e",
      "--color-rose-600": "#e11d48",
    },
  },
];

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

