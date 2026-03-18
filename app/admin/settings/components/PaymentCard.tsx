"use client";

import { Input } from "@/app/components/ui/input";
import { ConfigFormData } from "@/app/hooks/useSystemConfig";
import { QrCode } from "lucide-react";

interface PaymentCardProps {
  formData: ConfigFormData;
  onFieldChange: (key: keyof ConfigFormData, value: string) => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-8 py-2.5 bg-slate-50/80 border-b border-slate-100">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{children}</span>
    </div>
  );
}

function SettingsRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-8 px-8 py-5 border-b border-slate-100 last:border-0">
      <div className="w-48 flex-shrink-0 pt-1">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function PaymentCard({ formData, onFieldChange }: PaymentCardProps) {
  return (
    <div>
      <SectionLabel>PIX</SectionLabel>

      <SettingsRow
        label="Chave PIX"
        description="CPF, CNPJ, email, telefone ou chave aleatória. Usada para gerar QR codes de pagamento nos recibos."
      >
        <div className="relative max-w-sm">
          <Input
            value={formData.payment_pix_key}
            onChange={(e) => onFieldChange('payment_pix_key', e.target.value)}
            placeholder="CPF, CNPJ, Email ou Chave Aleatória"
            className="pl-9 h-9 text-sm rounded-lg border-slate-200"
          />
          <QrCode className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        </div>
      </SettingsRow>
    </div>
  );
}
