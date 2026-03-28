"use client";

import { useState } from "react";
import { THEMES, ThemeId } from "@/lib/themes";

export function ThemePicker({ current }: { current: ThemeId }) {
  const [selected, setSelected] = useState<ThemeId>(current);
  const [saving, setSaving] = useState(false);

  async function handleSelect(id: ThemeId) {
    if (id === selected) return;
    setSelected(id);
    setSaving(true);
    await fetch("/api/user/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: id }),
    });
    setSaving(false);
    window.location.reload();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {THEMES.map((theme) => {
        const isSelected = selected === theme.id;
        return (
          <button
            key={theme.id}
            onClick={() => handleSelect(theme.id)}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-all disabled:opacity-50 lowercase"
            style={{
              borderColor: isSelected ? theme.swatch : "transparent",
              backgroundColor: isSelected ? `${theme.swatch}18` : "#f9a8d420",
              color: isSelected ? theme.swatch : undefined,
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: theme.swatch }}
            />
            {theme.label.toLowerCase()}
          </button>
        );
      })}
    </div>
  );
}
