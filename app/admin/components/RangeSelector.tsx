"use client";

import { cn } from "@/lib/utils";
import type { RangeOption } from "../types";

type RangeSelectorProps = {
    options: RangeOption[];
    currentValue: number;
    onSelect: (value: number) => void;
};

export function RangeSelector({ options, currentValue, onSelect }: RangeSelectorProps) {
    return (
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 gap-0.5">
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onSelect(option.value)}
                    className={cn(
                        "px-3 py-1 text-sm rounded-md font-medium transition-all",
                        currentValue === option.value
                            ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                            : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
