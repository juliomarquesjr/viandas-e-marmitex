"use client";

import type { RangeOption } from "../types";
import { Button } from "../../components/ui/button";

type RangeSelectorProps = {
    options: RangeOption[];
    currentValue: number;
    onSelect: (value: number) => void;
};

export function RangeSelector({ options, currentValue, onSelect }: RangeSelectorProps) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((option) => (
                <Button
                    key={option.value}
                    variant={currentValue === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSelect(option.value)}
                >
                    {option.label}
                </Button>
            ))}
        </div>
    );
}
