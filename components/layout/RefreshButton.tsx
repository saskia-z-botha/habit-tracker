"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

interface RefreshButtonProps {
  date: string;
}

export function RefreshButton({ date }: RefreshButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRefresh() {
    setLoading(true);
    await fetch(`/api/sync?date=${date}`, { method: "POST" });
    // Full reload so HabitList reinitializes with fresh server data
    window.location.reload();
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className="p-1.5 rounded-lg hover:bg-pink-100 text-pink-400 hover:text-pink-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
      aria-label="Sync habits"
    >
      <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
    </button>
  );
}
