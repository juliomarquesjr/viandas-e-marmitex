import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * Input Component - Design System
 * 
 * Input moderno com estados visuais claros.
 * Inspirado em HubSpot/Salesforce.
 */

const inputVariants = cva(
  "flex w-full text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
  {
    variants: {
      variant: {
        default: "border border-slate-300 bg-white hover:border-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20",
        error: "border border-red-500 bg-red-50/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
        success: "border border-emerald-500 bg-emerald-50/50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20",
      },
      inputSize: {
        default: "h-10 px-3 py-2 rounded-lg",
        sm: "h-8 px-2.5 py-1.5 text-xs rounded-md",
        lg: "h-12 px-4 py-3 text-base rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
  VariantProps<typeof inputVariants> {
  /** Ícone à esquerda */
  leftIcon?: React.ReactNode;
  /** Ícone à direita */
  rightIcon?: React.ReactNode;
  /** Mensagem de erro */
  error?: string;
  /** Mensagem de ajuda */
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, inputSize, leftIcon, rightIcon, error, helperText, ...props }, ref) => {
    const hasError = !!error;
    const currentVariant = hasError ? "error" : variant;

    return (
      <div className="w-full">
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              inputVariants({ variant: currentVariant, inputSize }),
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              "outline-none",
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

/**
 * Textarea Component
 */
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition-all duration-200",
            "placeholder:text-slate-400 hover:border-slate-400",
            "focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none",
            "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
            error && "border-red-500 bg-red-50/50 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-red-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";


