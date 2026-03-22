"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  FileText,
  Calendar,
  Building2,
  Package,
  DollarSign,
  QrCode,
  Receipt,
  MapPin,
  Copy,
  Check,
  Hash,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { InvoiceData } from "@/lib/nf-scanner/types";

interface InvoiceDataDisplayProps {
  invoiceData: InvoiceData;
  onClose: () => void;
  readOnly?: boolean;
  expenseId?: string;
  onUseForExpense?: () => void;
  onScanAgain?: () => void;
}

function SectionDivider({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 pt-1">
      {icon && <span className="text-slate-400">{icon}</span>}
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-900 text-right">{children}</span>
    </div>
  );
}

const modeloConfig = {
  "65": { label: "NFC-e" },
  "55": { label: "NF-e" },
  "SAT": { label: "SAT" },
};

export function InvoiceDataDisplay({
  invoiceData,
  onClose,
  readOnly = false,
  expenseId,
  onUseForExpense,
  onScanAgain,
}: InvoiceDataDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  useEffect(() => {
    if (readOnly || !invoiceData.chaveAcesso) return;
    setIsCheckingDuplicate(true);
    setIsDuplicate(false);
    fetch(`/api/expenses?nfChaveAcesso=${encodeURIComponent(invoiceData.chaveAcesso)}&limit=1`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) return;
        const existing = (data.expenses ?? []).filter(
          (e: { id?: string }) => !expenseId || e.id !== expenseId
        );
        if (existing.length > 0) setIsDuplicate(true);
      })
      .catch(() => {/* falha silenciosa */})
      .finally(() => setIsCheckingDuplicate(false));
  }, [invoiceData.chaveAcesso, readOnly, expenseId]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(invoiceData.chaveAcesso);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const modeloInfo = modeloConfig[invoiceData.modelo as keyof typeof modeloConfig] ?? { label: "NF" };
  const emitente = invoiceData.emitente;
  const end = emitente.endereco;
  const enderecoStr = end
    ? [
        end.logradouro,
        end.numero && `nº ${end.numero}`,
        end.bairro,
        end.municipio && end.uf ? `${end.municipio}/${end.uf}` : end.municipio ?? end.uf,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  const temDesconto =
    invoiceData.totais.valorDesconto != null && invoiceData.totais.valorDesconto > 0;
  const temFrete =
    invoiceData.totais.valorFrete != null && invoiceData.totais.valorFrete > 0;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        overlayClassName="z-[100] backdrop-blur-sm"
        className="z-[100] sm:max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] flex flex-col overflow-hidden gap-0 p-0 shadow-2xl"
      >
        {/* Header */}
        <DialogHeader
          className="px-6 pt-5 pb-4 border-b flex-shrink-0"
          style={{ background: "var(--modal-header-bg)", borderColor: "rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{
                background: "var(--modal-header-icon-bg)",
                outline: "1px solid var(--modal-header-icon-ring)",
              }}
            >
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle
                className="text-base font-bold leading-tight"
                style={{ color: "var(--modal-header-text)" }}
              >
                Dados da Nota Fiscal
              </DialogTitle>
              <div
                className="flex items-center gap-2 mt-1 text-xs"
                style={{ color: "var(--modal-header-description)" }}
              >
                <span className="inline-flex items-center bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 font-medium text-[11px]">
                  {modeloInfo.label}
                </span>
                <span>·</span>
                <span>UF {invoiceData.uf}</span>
                <span>·</span>
                <span>Confira os dados antes de aplicar</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Identificação */}
          <SectionDivider label="Identificação" icon={<Hash className="h-3.5 w-3.5" />} />
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 divide-y divide-slate-100 px-4">
            <InfoRow label="Número / Série">
              <span className="font-bold tabular-nums">
                {invoiceData.numero}
                {invoiceData.serie && (
                  <span className="font-normal text-slate-500 ml-1">série {invoiceData.serie}</span>
                )}
              </span>
            </InfoRow>
            <InfoRow label="Data de Emissão">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {formatDate(invoiceData.dataEmissao)}
              </span>
            </InfoRow>
            <InfoRow label="Modelo">
              {modeloInfo.label}
            </InfoRow>
          </div>

          {/* Chave de Acesso */}
          <SectionDivider label="Chave de Acesso SEFAZ" icon={<QrCode className="h-3.5 w-3.5" />} />
          <div className="group relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12">
            <p className="font-mono text-xs text-slate-600 break-all leading-relaxed flex-1">
              {invoiceData.chaveAcesso}
            </p>
            <button
              onClick={handleCopyKey}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150 text-slate-400 hover:bg-primary hover:text-white"
              title="Copiar chave de acesso"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Aviso de NF duplicada */}
          {!readOnly && isDuplicate && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800 leading-snug">
                Esta nota fiscal já está vinculada a outra despesa e não pode ser utilizada novamente.
              </p>
            </div>
          )}

          {/* Emitente */}
          <SectionDivider label="Emitente" icon={<Building2 className="h-3.5 w-3.5" />} />
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 divide-y divide-slate-100 px-4">
            <InfoRow label="Razão Social">
              <span className="font-semibold">{emitente.razaoSocial}</span>
            </InfoRow>
            {emitente.nomeFantasia && (
              <InfoRow label="Nome Fantasia">{emitente.nomeFantasia}</InfoRow>
            )}
            <InfoRow label="CNPJ">
              <span className="font-mono tracking-wide">{emitente.cnpj}</span>
            </InfoRow>
            {enderecoStr && (
              <InfoRow label="Endereço">
                <span className="flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span>{enderecoStr}</span>
                </span>
              </InfoRow>
            )}
          </div>

          {/* Valores */}
          <SectionDivider label="Valores" icon={<DollarSign className="h-3.5 w-3.5" />} />
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 divide-y divide-slate-100 px-4">
            <InfoRow label="Valor dos Produtos">
              <span className="tabular-nums">{formatCurrency(invoiceData.totais.valorProdutos)}</span>
            </InfoRow>
            {temDesconto && (
              <InfoRow label="Desconto">
                <span className="tabular-nums text-red-600">
                  -{formatCurrency(invoiceData.totais.valorDesconto!)}
                </span>
              </InfoRow>
            )}
            {temFrete && (
              <InfoRow label="Frete">
                <span className="tabular-nums">{formatCurrency(invoiceData.totais.valorFrete!)}</span>
              </InfoRow>
            )}
            <div className="flex items-center justify-between py-3">
              <span className="text-sm font-semibold text-slate-700">Total a Pagar</span>
              <span className="text-xl font-extrabold text-emerald-600 tabular-nums">
                {formatCurrency(invoiceData.totais.valorTotal)}
              </span>
            </div>
          </div>

          {/* Itens */}
          <SectionDivider label={`Itens (${invoiceData.itens.length})`} icon={<Package className="h-3.5 w-3.5" />} />
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {invoiceData.itens.map((item, index) => (
              <div
                key={index}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-white px-4 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 leading-snug">
                    {item.descricao}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.quantidade} {item.unidade || "un"} × {formatCurrency(item.valorUnitario)}
                    {item.codigo && (
                      <span className="ml-2 text-slate-400">· Cód. {item.codigo}</span>
                    )}
                  </p>
                </div>
                <span className="text-sm font-bold text-slate-700 tabular-nums shrink-0">
                  {formatCurrency(item.valorTotal)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t-2 border-slate-200 bg-slate-100 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>
              {readOnly
                ? "Nota fiscal vinculada a esta despesa"
                : "Valor total e data serão preenchidos automaticamente"}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {!readOnly && onScanAgain && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onScanAgain}
                className="gap-1.5"
              >
                <QrCode className="h-3.5 w-3.5" />
                Escanear outra
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Fechar
            </Button>
            {!readOnly && onUseForExpense && (
              <Button
                type="button"
                size="sm"
                onClick={onUseForExpense}
                disabled={isCheckingDuplicate || isDuplicate}
                className="gap-1.5 min-w-[140px]"
              >
                {isCheckingDuplicate ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Receipt className="h-3.5 w-3.5" />
                )}
                {isCheckingDuplicate ? "Verificando..." : "Usar para despesa"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
