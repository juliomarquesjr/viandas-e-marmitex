"use client";

import { useState } from "react";
import { GRADIENT_PRESETS, SOLID_PRESETS, type BoardBackground } from "../shared/types";
import { cn } from "@/lib/utils";
import { Check, Image } from "lucide-react";

interface BackgroundPickerProps {
  value: BoardBackground;
  onChange: (bg: BoardBackground) => void;
}

export function BackgroundPicker({ value, onChange }: BackgroundPickerProps) {
  const [tab, setTab] = useState<"gradient" | "solid" | "image">("gradient");
  const [imageUrl, setImageUrl] = useState(value.type === "image" ? value.value : "");

  const isActive = (bg: BoardBackground) => {
    if (bg.type !== value.type) return false;
    return bg.value === value.value;
  };

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-black/20 p-0.5">
        {(["gradient", "solid", "image"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-md py-1 text-xs font-medium transition-colors capitalize",
              tab === t
                ? "bg-white/20 text-white"
                : "text-white/60 hover:text-white/80"
            )}
          >
            {t === "gradient" ? "Gradiente" : t === "solid" ? "Cor" : "Imagem"}
          </button>
        ))}
      </div>

      {/* Gradients */}
      {tab === "gradient" && (
        <div className="grid grid-cols-4 gap-2">
          {GRADIENT_PRESETS.map((preset) => {
            const bg: BoardBackground = { type: "gradient", value: preset.value };
            const active = isActive(bg);
            return (
              <button
                key={preset.id}
                type="button"
                title={preset.label}
                onClick={() => onChange(bg)}
                className="relative h-10 w-full rounded-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50"
                style={{ background: preset.value }}
              >
                {active && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white drop-shadow" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Solids */}
      {tab === "solid" && (
        <div className="grid grid-cols-6 gap-2">
          {SOLID_PRESETS.map((preset) => {
            const bg: BoardBackground = { type: "solid", value: preset.value };
            const active = isActive(bg);
            return (
              <button
                key={preset.id}
                type="button"
                title={preset.label}
                onClick={() => onChange(bg)}
                className="relative h-8 w-8 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50"
                style={{ background: preset.value }}
              >
                {active && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white drop-shadow" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Image URL */}
      {tab === "image" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-white/60" />
            <span className="text-xs text-white/60">URL da imagem</span>
          </div>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              if (e.target.value) onChange({ type: "image", value: e.target.value });
            }}
            placeholder="https://..."
            className="w-full rounded-lg bg-black/20 border border-white/20 px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-white/40"
          />
          {imageUrl && (
            <div
              className="h-16 w-full rounded-lg bg-cover bg-center border border-white/20"
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
          )}
        </div>
      )}
    </div>
  );
}
