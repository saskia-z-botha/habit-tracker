"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddHabitModal } from "./AddHabitModal";

export function TodayActions() {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setShowAdd(true)}>
        <Plus size={14} />
        add habit
      </Button>
      <AddHabitModal open={showAdd} onClose={() => setShowAdd(false)} />
    </>
  );
}
