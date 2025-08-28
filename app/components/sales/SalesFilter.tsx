"use client";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Check, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

interface SalesFilterProps {
  onFilterChange: (filters: {
    searchTerm: string;
    dateRange: { start: string; end: string };
  }) => void;
  className?: string;
}

export function SalesFilter({ onFilterChange, className }: SalesFilterProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
  const [quickDateFilter, setQuickDateFilter] = useState<string>("today");
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onFilterChange({ searchTerm: value, dateRange: dateFilter });
  };

  const handleQuickDateFilter = (filter: string) => {
    setQuickDateFilter(filter);
    
    if (filter === "custom") {
      setShowCustomDatePicker(true);
    } else {
      const range = getQuickDateRange(filter);
      setDateFilter(range);
      setShowCustomDatePicker(false);
      onFilterChange({ searchTerm, dateRange: range });
    }
  };

  // Aplicar filtro inicial (hoje) quando o componente montar
  useEffect(() => {
    const todayRange = getQuickDateRange("today");
    setDateFilter(todayRange);
    onFilterChange({ searchTerm, dateRange: todayRange });
  }, []);

  const handleCustomDateApply = () => {
    if (dateFilter.start && dateFilter.end) {
      setQuickDateFilter("custom");
      setShowCustomDatePicker(false);
      onFilterChange({ searchTerm, dateRange: dateFilter });
    }
  };

  const handleCustomDateCancel = () => {
    setShowCustomDatePicker(false);
    setQuickDateFilter("today");
    const todayRange = getQuickDateRange("today");
    setDateFilter(todayRange);
    onFilterChange({ searchTerm, dateRange: todayRange });
  };

  const getQuickDateRange = (filter: string) => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const formatDateLocal = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    switch (filter) {
      case "today":
        return {
          start: formatDateLocal(startOfDay),
          end: formatDateLocal(startOfDay)
        };
        
      case "yesterday":
        const yesterday = new Date(startOfDay);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          start: formatDateLocal(yesterday),
          end: formatDateLocal(yesterday)
        };
        
      case "week":
        const startOfWeek = new Date(startOfDay);
        startOfWeek.setDate(startOfWeek.getDate() - 7);
        return {
          start: formatDateLocal(startOfWeek),
          end: formatDateLocal(startOfDay)
        };
        
      case "month":
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          start: formatDateLocal(startOfMonth),
          end: formatDateLocal(startOfDay)
        };
        
      default:
        return { start: "", end: "" };
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("bg-white rounded-2xl border border-border shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl", className)}
    >
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Filtrar Vendas</h2>
            <p className="text-sm text-muted-foreground">Refine sua busca por período e cliente</p>
          </div>
          
          {/* Busca */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-4 py-3 text-base border-border bg-background focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl"
            />
          </div>
        </div>

        {/* Filtros Rápidos de Data */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Período
          </h3>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "today", label: "Hoje", icon: Calendar },
              { key: "yesterday", label: "Ontem", icon: Calendar },
              { key: "week", label: "7 dias", icon: Calendar },
              { key: "month", label: "30 dias", icon: Calendar },
              { key: "custom", label: "Personalizado", icon: Calendar }
            ].map((filter) => (
              <motion.div
                key={filter.key}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant={quickDateFilter === filter.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickDateFilter(filter.key)}
                  className={cn(
                    "h-10 px-4 rounded-full text-sm font-medium transition-all duration-200 shadow-sm",
                    quickDateFilter === filter.key
                      ? "bg-primary text-primary-foreground border-primary shadow-primary/20 hover:bg-primary/90"
                      : "border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <filter.icon className="h-4 w-4 mr-2" />
                  {filter.label}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Seletor de Datas Personalizadas */}
        <AnimatePresence>
          {showCustomDatePicker && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-border pt-6 mt-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Período Personalizado
                </h4>
                <Button
                  onClick={handleCustomDateCancel}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data Início */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Data Início</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={dateFilter.start}
                      onChange={(e) => setDateFilter((prev) => ({ ...prev, start: e.target.value }))}
                      className="w-full px-4 py-3 text-base rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Data Fim */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Data Fim</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={dateFilter.end}
                      onChange={(e) => setDateFilter((prev) => ({ ...prev, end: e.target.value }))}
                      className="w-full px-4 py-3 text-base rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Botão Aplicar */}
              <div className="mt-6 flex justify-end">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={handleCustomDateApply}
                    disabled={!dateFilter.start || !dateFilter.end}
                    size="lg"
                    className="px-6 h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md disabled:opacity-50"
                  >
                    <Check className="h-5 w-5 mr-2" />
                    Aplicar Filtros
                  </Button>
                </motion.div>
              </div>

              {/* Preview compacto */}
              {dateFilter.start && dateFilter.end && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-xl"
                >
                  <p className="text-sm text-primary text-center font-medium">
                    Período: {new Date(dateFilter.start).toLocaleDateString('pt-BR')} → {new Date(dateFilter.end).toLocaleDateString('pt-BR')}
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}