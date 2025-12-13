"use client";

import { Scale, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface WeightInputModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (weightKg: number) => void;
  productName: string;
  pricePerKgCents: number;
  formatPriceToReais: (cents: number) => string;
}

export function WeightInputModal({
  open,
  onClose,
  onConfirm,
  productName,
  pricePerKgCents,
  formatPriceToReais,
}: WeightInputModalProps) {
  const [weight, setWeight] = useState<string>("");
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setWeight("");
      setError("");
      // Focar no campo de peso após um pequeno delay para garantir que o modal está renderizado
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Permitir apenas números e ponto/vírgula decimal
    const cleanedValue = value.replace(/[^0-9,.]/g, "");
    
    // Substituir vírgula por ponto
    const normalizedValue = cleanedValue.replace(",", ".");
    
    // Validar formato (máximo 3 casas decimais)
    if (normalizedValue === "" || normalizedValue === ".") {
      setWeight(normalizedValue);
      setError("");
      return;
    }

    const numValue = parseFloat(normalizedValue);
    
    if (isNaN(numValue)) {
      setWeight(normalizedValue);
      setError("");
      return;
    }

    // Validar limites
    if (numValue < 0.001) {
      setError("Peso mínimo: 0,001 kg (1 grama)");
      setWeight(normalizedValue);
      return;
    }

    if (numValue > 999.999) {
      setError("Peso máximo: 999,999 kg");
      setWeight(normalizedValue);
      return;
    }

    setWeight(normalizedValue);
    setError("");
  };

  const handleConfirm = () => {
    if (!weight || weight === "") {
      setError("Por favor, insira o peso");
      return;
    }

    const numWeight = parseFloat(weight.replace(",", "."));
    
    if (isNaN(numWeight) || numWeight < 0.001) {
      setError("Peso mínimo: 0,001 kg (1 grama)");
      return;
    }

    if (numWeight > 999.999) {
      setError("Peso máximo: 999,999 kg");
      return;
    }

    onConfirm(numWeight);
    setWeight("");
    setError("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleConfirm();
    }
  };

  if (!open) return null;

  const pricePerKg = formatPriceToReais(pricePerKgCents);
  const numWeight = weight ? parseFloat(weight.replace(",", ".")) : 0;
  const totalPriceCents = numWeight > 0 ? Math.round(pricePerKgCents * numWeight) : 0;
  const totalPrice = formatPriceToReais(totalPriceCents);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-md max-h-[95vh] overflow-hidden bg-white shadow-2xl rounded-2xl border border-gray-200 flex flex-col">
        {/* Header with gradient and shadow */}
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 sticky top-0 z-20 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Scale className="h-5 w-5 text-orange-600" />
                Inserir Peso
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1 text-sm">
                {productName}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-12 w-12 rounded-full bg-white/60 hover:bg-white shadow-md border border-gray-200 text-gray-600 hover:text-gray-800 transition-all hover:scale-105"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </CardHeader>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto">
          <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label
              htmlFor="weight"
              className="text-sm font-medium text-gray-700"
            >
              Peso (kg) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="weight"
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={weight}
                onChange={handleWeightChange}
                onKeyPress={handleKeyPress}
                placeholder="0,000"
                className="pl-10 pr-4 py-3 text-lg rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all"
              />
              <Scale className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <p className="text-xs text-gray-500">
              Peso mínimo: 0,001 kg (1 grama) | Máximo: 999,999 kg
            </p>
          </div>

          <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Preço por quilo:</span>
              <span className="text-lg font-semibold text-gray-900">{pricePerKg}/kg</span>
            </div>
            {numWeight > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Peso:</span>
                  <span className="text-lg font-semibold text-gray-900">{numWeight.toFixed(3)} kg</span>
                </div>
                <div className="pt-2 border-t border-orange-200">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-gray-900">Total:</span>
                    <span className="text-2xl font-bold text-orange-600">{totalPrice}</span>
                  </div>
                </div>
              </>
            )}
          </div>
          </CardContent>
        </div>
        
        {/* Rodapé fixo */}
        <div className="sticky bottom-0 z-20 bg-gray-50/50 border-t border-gray-200 px-6 py-6">
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-6 py-3 rounded-xl border-gray-300 hover:bg-gray-100 text-gray-700 font-medium transition-all"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!weight || parseFloat(weight.replace(",", ".")) < 0.001}
              className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Adicionar ao Carrinho
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

