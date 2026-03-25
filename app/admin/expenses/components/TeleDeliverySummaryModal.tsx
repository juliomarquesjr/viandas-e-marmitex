"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Calendar, ExternalLink, FileText, Package, Printer, Truck } from "lucide-react";
import { useEffect, useState } from "react";

interface TeleDeliverySummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

export function TeleDeliverySummaryModal({
  open,
  onOpenChange,
}: TeleDeliverySummaryModalProps) {
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [dateError, setDateError] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<"current" | "previous" | null>("current");
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [loadingProducts, setLoadingProducts] = useState(false);

  const PRODUCT_SESSION_KEY = "tele-delivery-product-id";

  useEffect(() => {
    const loadProducts = async () => {
      if (!open) return;

      setLoadingProducts(true);
      try {
        const response = await fetch("/api/products?q=tele");
        const data = await response.json();
        setProducts(data.data || []);

        if (data.data && data.data.length > 0) {
          const saved = sessionStorage.getItem(PRODUCT_SESSION_KEY);
          const validSaved = saved && data.data.some((p: any) => p.id === saved);
          setSelectedProductId(validSaved ? saved : data.data[0].id);
        }
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, [open]);

  const handleProductChange = (id: string) => {
    setSelectedProductId(id);
    sessionStorage.setItem(PRODUCT_SESSION_KEY, id);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(lastDay.toISOString().split("T")[0]);
    setDateError("");
    setSelectedPreset("current");
  };

  const handlePreviousMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(lastDay.toISOString().split("T")[0]);
    setDateError("");
    setSelectedPreset("previous");
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setSelectedPreset(null);
    if (endDate && value > endDate) {
      setDateError("Data inicial deve ser menor ou igual à data final");
    } else {
      setDateError("");
    }
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    setSelectedPreset(null);
    if (startDate && value < startDate) {
      setDateError("Data final deve ser maior ou igual à data inicial");
    } else {
      setDateError("");
    }
  };

  const handlePrintThermal = () => {
    const url = `/print/tele-delivery-thermal?startDate=${startDate}&endDate=${endDate}&productId=${selectedProductId}`;
    window.open(url, "_blank");
    onOpenChange(false);
  };

  const handlePrintA4 = () => {
    const url = `/print/tele-delivery-a4?startDate=${startDate}&endDate=${endDate}&productId=${selectedProductId}`;
    window.open(url, "_blank");
    onOpenChange(false);
  };

  const canPrint = !!startDate && !!endDate && !dateError && !!selectedProductId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{
                background: "var(--modal-header-icon-bg)",
                outline: "1px solid var(--modal-header-icon-ring)",
              }}
            >
              <Truck className="h-5 w-5 text-primary" />
            </div>
            Resumo de Tele Entrega
          </DialogTitle>
          <DialogDescription>
            Selecione o período e o formato de impressão
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* ── Período ── */}
          <SectionDivider label="Período" />

          <div className="flex gap-2">
            <Button
              type="button"
              variant={selectedPreset === "current" ? "default" : "outline"}
              size="sm"
              onClick={handleCurrentMonth}
              className="flex-1 text-xs"
            >
              Mês Atual
            </Button>
            <Button
              type="button"
              variant={selectedPreset === "previous" ? "default" : "outline"}
              size="sm"
              onClick={handlePreviousMonth}
              className="flex-1 text-xs"
            >
              Mês Anterior
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Data inicial
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className={`pl-9 ${dateError && startDate > endDate ? "border-red-400 focus:ring-red-400/20" : ""}`}
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Data final
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className={`pl-9 ${dateError && endDate < startDate ? "border-red-400 focus:ring-red-400/20" : ""}`}
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>

          {dateError && (
            <p className="text-xs text-red-500">{dateError}</p>
          )}

          {/* ── Produto ── */}
          <SectionDivider label="Produto" />

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Produto de tele entrega
            </Label>
            <Select
              value={selectedProductId}
              onValueChange={handleProductChange}
              disabled={loadingProducts || products.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingProducts ? "Carregando..." : "Selecione um produto"} />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {products.length === 0 && !loadingProducts && (
              <p className="text-xs text-red-500">
                Nenhum produto encontrado com &quot;tele&quot; no nome
              </p>
            )}
          </div>

          {/* ── Impressão ── */}
          <SectionDivider label="Formato de impressão" />

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handlePrintThermal}
              disabled={!canPrint}
              className="group relative p-4 border-2 border-slate-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-start gap-2">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
                  style={{
                    background: "var(--modal-header-icon-bg)",
                    outline: "1px solid var(--modal-header-icon-ring)",
                  }}
                >
                  <Printer className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">Térmica</div>
                  <div className="text-xs text-slate-500 mt-0.5">58mm</div>
                </div>
              </div>
            </button>

            <button
              onClick={handlePrintA4}
              disabled={!canPrint}
              className="group relative p-4 border-2 border-slate-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-start gap-2">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
                  style={{
                    background: "var(--modal-header-icon-bg)",
                    outline: "1px solid var(--modal-header-icon-ring)",
                  }}
                >
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">A4</div>
                  <div className="text-xs text-slate-500 mt-0.5">Completo</div>
                </div>
              </div>
            </button>
          </div>

        </div>

        <DialogFooter>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
            O relatório será aberto em uma nova aba
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
