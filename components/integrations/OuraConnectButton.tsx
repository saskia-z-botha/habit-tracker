"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface OuraConnectButtonProps {
  connected: boolean;
}

export function OuraConnectButton({ connected }: OuraConnectButtonProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    await fetch("/api/oura/disconnect", { method: "POST" });
    router.refresh();
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/oura/sync-user", { method: "POST" });
      const data = await res.json();
      const parts = [];
      if (data.steps !== null && data.steps !== undefined) parts.push(`${data.steps.toLocaleString()} steps`);
      if (data.sleep !== null && data.sleep !== undefined) parts.push(data.sleep ? "sleep ✓" : "sleep ✗");
      setLastSync(parts.length ? parts.join(" · ") : "synced");
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  if (connected) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
          <span className="text-pink-700 font-medium">Oura connected</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? "Syncing…" : "↻ Sync now"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDisconnect} disabled={disconnecting} className="text-pink-300 hover:text-rose-500">
            Disconnect
          </Button>
        </div>
        {lastSync && <p className="text-xs text-pink-400">{lastSync}</p>}
      </div>
    );
  }

  return (
    <a href="/api/oura/connect">
      <Button variant="secondary" size="sm">
        <span className="text-base leading-none">💍</span>
        Connect Oura Ring
      </Button>
    </a>
  );
}
