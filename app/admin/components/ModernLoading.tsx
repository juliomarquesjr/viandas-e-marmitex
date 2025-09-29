"use client";

import { Loader2, BarChart3 } from "lucide-react";

type ModernLoadingProps = {
    variant?: 'default' | 'chart' | 'minimal';
    message?: string;
};

export function ModernLoading({ variant = 'default', message = 'Carregando dados...' }: ModernLoadingProps) {
    if (variant === 'minimal') {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
        );
    }

    if (variant === 'chart') {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 space-y-4">
                <div className="relative">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl opacity-20 animate-pulse blur-sm" />
                </div>
                <div className="text-center">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{message}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-12 space-y-6">
            <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl">
                    <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl opacity-20 animate-pulse blur-md" />
                <div className="absolute top-0 right-0 h-4 w-4 rounded-full bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center">
                    <Loader2 className="h-2.5 w-2.5 text-white animate-spin" />
                </div>
            </div>
            
            <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-slate-900">Carregando Dashboard</h3>
                <p className="text-sm text-slate-600">{message}</p>
                
                <div className="flex items-center justify-center gap-1 mt-4">
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{animationDelay: '0ms'}} />
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{animationDelay: '150ms'}} />
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{animationDelay: '300ms'}} />
                </div>
            </div>
        </div>
    );
}