"use client";

import {
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  QrCode,
} from "lucide-react";

const PAYMENT_METHODS = [
  {
    label: "Dinheiro",
    icon: CircleDollarSign,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    label: "Cartão Débito",
    icon: CreditCard,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    label: "Cartão Crédito",
    icon: CreditCard,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    label: "PIX",
    icon: QrCode,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
  },
  {
    label: "Ficha do Cliente",
    icon: ClipboardList,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
];

interface PaymentMethodListProps {
  selectedPayment: string | null;
  onSelect: (method: string) => void;
}

export function PaymentMethodList({ selectedPayment, onSelect }: PaymentMethodListProps) {
  return (
    <div className="flex flex-col gap-2">
      {PAYMENT_METHODS.map((method) => {
        const isActive = selectedPayment === method.label;
        return (
          <button
            key={method.label}
            onClick={() => onSelect(method.label)}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
              isActive
                ? "border-primary bg-[var(--primary-lighter)] ring-1 ring-primary/30"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div
              className={`h-9 w-9 flex-shrink-0 rounded-full flex items-center justify-center ${method.iconBg}`}
            >
              <method.icon className={`h-5 w-5 ${method.iconColor}`} />
            </div>
            <span
              className={`text-sm font-medium ${
                isActive ? "text-primary" : "text-slate-700"
              }`}
            >
              {method.label}
            </span>
            <div
              className={`ml-auto h-4 w-4 rounded-full border-2 flex-shrink-0 transition-colors duration-200 ${
                isActive ? "border-primary bg-primary" : "border-slate-300"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
