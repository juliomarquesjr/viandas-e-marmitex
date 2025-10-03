"use client";

import RoAssistant from "../components/ro-assistant";

export default function RoAssistantPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-6rem)] items-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 py-12">
      <RoAssistant variant="contained" defaultOpen />
    </div>
  );
}
