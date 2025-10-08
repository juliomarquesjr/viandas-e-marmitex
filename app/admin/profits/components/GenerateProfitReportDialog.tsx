"use client";

import { motion } from "framer-motion";
import { BarChart3, Calendar, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

interface GenerateProfitReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (startDate: string, endDate: string) => void;
  isLoading?: boolean;
}

export function GenerateProfitReportDialog({
  isOpen,
  onClose,
  onGenerate,
  isLoading = false,
}: GenerateProfitReportDialogProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Inicializar com o mês atual
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      setStartDate(firstDay.toISOString().split("T")[0]);
      setEndDate(lastDay.toISOString().split("T")[0]);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    onGenerate(startDate, endDate);
  };

  // Atalhos para períodos comuns
  const setCurrentMonth = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(lastDay.toISOString().split("T")[0]);
  };

  const setLastMonth = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
    
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(lastDay.toISOString().split("T")[0]);
  };

  const setLast30Days = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setStartDate(thirtyDaysAgo.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl max-h-[95vh] overflow-hidden bg-white shadow-2xl rounded-2xl border border-gray-200 flex flex-col"
      >
        {/* Header with gradient and shadow */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 p-6 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-600" />
                Gerar Relatório de Lucros
              </h2>
              <p className="text-gray-600 mt-1 text-sm">
                Selecione o período para análise de receitas, despesas e lucros
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isLoading}
              className="h-10 w-10 rounded-full hover:bg-white/50 text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable form content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="profit-report-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Seção de Atalhos */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <Calendar className="h-4 w-4 text-orange-600" />
                <h3 className="text-base font-semibold text-orange-800">
                  Atalhos de Período
                </h3>
              </div>
              <div className="mt-3 h-px bg-gradient-to-r from-orange-100 via-orange-300 to-orange-100"></div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={setCurrentMonth}
                  disabled={isLoading}
                  className="border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-all"
                >
                  Este Mês
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={setLastMonth}
                  disabled={isLoading}
                  className="border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-all"
                >
                  Mês Passado
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={setLast30Days}
                  disabled={isLoading}
                  className="border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-all"
                >
                  Últimos 30 Dias
                </Button>
              </div>
            </div>

            {/* Seção de Período Personalizado */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 mt-6">
                <Calendar className="h-4 w-4 text-orange-600" />
                <h3 className="text-base font-semibold text-orange-800">
                  Período Personalizado
                </h3>
              </div>
              <div className="mt-3 h-px bg-gradient-to-r from-orange-100 via-orange-300 to-orange-100"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    Data Inicial <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      disabled={isLoading}
                      className="pl-10 py-3 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all"
                    />
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    Data Final <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      disabled={isLoading}
                      className="pl-10 py-3 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all"
                    />
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer with actions */}
        <div className="border-t border-gray-200 p-6 bg-gray-50/50">
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-3 rounded-xl border-gray-300 hover:bg-gray-100 text-gray-700 font-medium transition-all"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="profit-report-form"
              disabled={isLoading}
              className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-lg hover:shadow-xl transition-all"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Gerando...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Gerar Relatório
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

