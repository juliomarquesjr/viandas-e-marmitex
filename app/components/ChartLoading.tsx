"use client";

import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

type ChartLoadingProps = {
    variant?: "bar" | "pie";
    message?: string;
    className?: string;
};

const barHeights = [40, 70, 55, 85, 60, 75];
const shimmerGradient = "linear-gradient(120deg,#e2e8f0 0%,#f8fafc 50%,#e2e8f0 100%)";

export function ChartLoading({ variant = "bar", message = "Carregando dados...", className }: ChartLoadingProps) {
    if (variant === "pie") {
        return (
            <div className={cn("flex h-full flex-col items-center justify-center gap-4 text-sm text-slate-500", className)}>
                <motion.div
                    className="relative flex h-36 w-36 items-center justify-center rounded-full bg-slate-100"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                >
                    <motion.div
                        className="h-24 w-24 rounded-full bg-[radial-gradient(circle at 30% 30%,#cbd5f5,transparent)]"
                        animate={{
                            scale: [0.95, 1.05, 0.95],
                            opacity: [0.7, 1, 0.7],
                        }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                    />
                    <motion.div
                        className="absolute inset-3 rounded-full border-2 border-dashed border-slate-300/70"
                        animate={{ rotate: -360 }}
                        transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                    />
                </motion.div>
                <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    <span>{message}</span>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("flex h-full flex-col items-center justify-center gap-4 text-sm text-slate-500", className)}>
            <div className="flex h-40 w-full max-w-md items-end gap-2">
                {barHeights.map((height, index) => (
                    <motion.div
                        key={index}
                        className="flex-1 rounded-t-xl bg-slate-100"
                        style={{
                            height: `${height}%`,
                            backgroundImage: shimmerGradient,
                            backgroundSize: "200% 100%",
                        }}
                        animate={{
                            backgroundPosition: ["0% 0%", "100% 0%"],
                            scaleY: [0.92, 1.05, 0.95],
                        }}
                        transition={{
                            backgroundPosition: { repeat: Infinity, duration: 1.6, ease: "linear", delay: index * 0.08 },
                            scaleY: { repeat: Infinity, duration: 1.4, ease: "easeInOut", delay: index * 0.08 },
                        }}
                    />
                ))}
            </div>
            <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                <span>{message}</span>
            </div>
        </div>
    );
}
