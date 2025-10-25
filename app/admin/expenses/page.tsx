"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Edit,
  Filter,
  Grid3X3,
  List,
  MoreVertical,
  Plus,
  Receipt,
  Settings,
  Trash2,
  X
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import {
  ExpenseFormData,
  ExpenseType,
  ExpenseWithRelations,
  SupplierType
} from "../../../lib/types";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui";
import { AnimatedCard } from "../../components/ui/animated-card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ManageExpenseTypesDialog } from "./components/ManageExpenseTypesDialog";
import { ManageSupplierTypesDialog } from "./components/ManageSupplierTypesDialog";

// Função para formatar moeda
const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
};

// Função para formatar data
const formatDate = (date: Date | string) => {
  const dateObj = new Date(date);
  
  // Extrair apenas a parte da data (ano, mês, dia) sem considerar timezone
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const day = dateObj.getDate();
  
  // Criar uma nova data local com os mesmos valores
  const localDate = new Date(year, month, day);
  return localDate.toLocaleDateString("pt-BR");
};

// Menu de opções por despesa
function ExpenseActionsMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 p-0"
        aria-label="Mais opções"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical className="h-5 w-5 text-muted-foreground" />
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-32 bg-background border border-border rounded-lg shadow-lg py-1 animate-fade-in">
          <button
            className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            <Edit className="h-4 w-4 mr-2 text-blue-500" /> Editar
          </button>
          <button
            className="flex items-center w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Remover
          </button>
        </div>
      )}
    </div>
  );
}

// Formulário de despesa
function ExpenseFormDialog({
  isOpen,
  onClose,
  onSave,
  expense,
  title,
  expenseTypes,
  supplierTypes,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ExpenseFormData) => void;
  expense?: ExpenseWithRelations;
  title: string;
  expenseTypes: ExpenseType[];
  supplierTypes: SupplierType[];
}) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    typeId: "",
    supplierTypeId: "",
    amountCents: 0,
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [displayPrice, setDisplayPrice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (expense) {
      setFormData({
        typeId: expense.typeId,
        supplierTypeId: expense.supplierTypeId,
        amountCents: expense.amountCents,
        description: expense.description,
        date: expense.date instanceof Date 
          ? expense.date.toISOString().split("T")[0]
          : new Date(expense.date).toISOString().split("T")[0],
      });
      // Formatar o preço
      const formatted = (expense.amountCents / 100).toFixed(2);
      setDisplayPrice(`R$ ${formatted.replace(".", ",")}`);
    } else {
      setFormData({
        typeId: "",
        supplierTypeId: "",
        amountCents: 0,
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
      setDisplayPrice("");
    }
  }, [expense, isOpen]);

  // Função para formatar o valor digitado como moeda
  const formatCurrencyInput = (value: string): string => {
    let cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length > 10) {
      cleanValue = cleanValue.substring(0, 10);
    }
    const numericValue = parseInt(cleanValue) || 0;
    const formatted = (numericValue / 100).toFixed(2);
    return `R$ ${formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ".").replace(".", ",")}`;
  };

  // Função para converter o valor formatado em centavos
  const convertToCents = (formattedValue: string): number => {
    const cleanValue = formattedValue
      .replace("R$ ", "")
      .replace(/\./g, "")
      .replace(",", ".");
    return Math.round(parseFloat(cleanValue) * 100);
  };

  // Função para lidar com a mudança no campo de preço
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = rawValue ? formatCurrencyInput(rawValue) : "";
    setDisplayPrice(formattedValue);
    const cents = rawValue ? convertToCents(formattedValue) : 0;
    setFormData({ ...formData, amountCents: cents });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.typeId || !formData.supplierTypeId || !formData.description.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
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
                <Receipt className="h-5 w-5 text-orange-600" />
                {title}
              </h2>
              <p className="text-gray-600 mt-1 text-sm">
                {expense
                  ? "Atualize as informações da despesa"
                  : "Preencha os dados para registrar uma nova despesa"}
              </p>
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
        </div>

        {/* Scrollable form content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seção Informações da Despesa */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <Receipt className="h-4 w-4 text-orange-600" />
                <h3 className="text-base font-semibold text-orange-800">
                  Informações da Despesa
                </h3>
              </div>
              <div className="mt-3 h-px bg-gradient-to-r from-orange-100 via-orange-300 to-orange-100"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    Tipo de Despesa <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Select
                      value={formData.typeId}
                      onValueChange={(value: string) =>
                        setFormData({ ...formData, typeId: value })
                      }
                    >
                      <SelectTrigger className="pl-10 py-3 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent 
                        className="z-[9999] bg-white border border-gray-200 shadow-lg" 
                        position="popper"
                        side="bottom"
                        align="start"
                      >
                        {expenseTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Receipt className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    Tipo de Fornecedor <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Select
                      value={formData.supplierTypeId}
                      onValueChange={(value: string) =>
                        setFormData({ ...formData, supplierTypeId: value })
                      }
                    >
                      <SelectTrigger className="pl-10 py-3 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all">
                        <SelectValue placeholder="Selecione o fornecedor" />
                      </SelectTrigger>
                      <SelectContent 
                        className="z-[9999] bg-white border border-gray-200 shadow-lg" 
                        position="popper"
                        side="bottom"
                        align="start"
                      >
                        {supplierTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    Valor <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      value={displayPrice}
                      onChange={handlePriceChange}
                      className="pl-10 py-3 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all"
                      placeholder="R$ 0,00"
                      required
                    />
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  {formData.amountCents > 0 && (
                    <p className="text-sm text-gray-500">
                      Valor em centavos: {formData.amountCents}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    Data <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className="pl-10 py-3 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all"
                      required
                    />
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  Descrição <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Descrição da despesa"
                    className="pl-10 py-3 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all"
                    required
                  />
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
              className="px-6 py-3 rounded-xl border-gray-300 hover:bg-gray-100 text-gray-700 font-medium transition-all"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                  {expense ? "Atualizando..." : "Cadastrando..."}
                </span>
              ) : (
                <>
                  <Receipt className="h-4 w-4 mr-2" />
                  {expense ? "Atualizar Despesa" : "Cadastrar Despesa"}
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseWithRelations[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [supplierTypes, setSupplierTypes] = useState<SupplierType[]>([]);
  const [mounted, setMounted] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    typeId: "all",
    supplierTypeId: "all",
    startDate: "",
    endDate: "",
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [manageExpenseTypesOpen, setManageExpenseTypesOpen] = useState(false);
  const [manageSupplierTypesOpen, setManageSupplierTypesOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithRelations | undefined>();
  const [deletingExpense, setDeletingExpense] = useState<ExpenseWithRelations | undefined>();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithRelations | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isManageMenuOpen, setIsManageMenuOpen] = useState(false);
  const { showToast } = useToast();

  // Evitar hydration mismatch e inicializar datas apenas no cliente
  useEffect(() => {
    setMounted(true);
    
    // Carregar preferência do usuário do localStorage
    const savedViewMode = localStorage.getItem('expenses-view-mode');
    if (savedViewMode && (savedViewMode === 'list' || savedViewMode === 'calendar')) {
      setViewMode(savedViewMode);
    }
  }, []);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isManageMenuOpen) {
        const target = event.target as Element;
        if (!target.closest('.manage-menu-container')) {
          setIsManageMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isManageMenuOpen]);

  // Carregar despesas
  const loadExpenses = async () => {
    try {
      setLoading(true);
      const normalized = {
        ...filters,
        typeId: filters.typeId === "all" ? "" : filters.typeId,
        supplierTypeId: filters.supplierTypeId === "all" ? "" : filters.supplierTypeId,
      };
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(normalized).filter(([_, value]) => value !== "")
        ),
      });

      const response = await fetch(`/api/expenses?${params}`);
      if (!response.ok) throw new Error("Failed to fetch expenses");
      const data = await response.json();
      setExpenses(data.expenses);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error loading expenses:", error);
      showToast("Erro ao carregar despesas", "error");
    } finally {
      setLoading(false);
    }
  };

  // Carregar tipos
  const loadTypes = async () => {
    try {
      const [expenseTypesRes, supplierTypesRes] = await Promise.all([
        fetch("/api/expense-types"),
        fetch("/api/supplier-types"),
      ]);

      if (!expenseTypesRes.ok || !supplierTypesRes.ok) {
        throw new Error("Failed to fetch types");
      }

      const [expenseTypesData, supplierTypesData] = await Promise.all([
        expenseTypesRes.json(),
        supplierTypesRes.json(),
      ]);

      setExpenseTypes(expenseTypesData);
      setSupplierTypes(supplierTypesData);
    } catch (error) {
      console.error("Error loading types:", error);
      showToast("Erro ao carregar tipos", "error");
    }
  };

  useEffect(() => {
    if (!mounted) return;
    loadExpenses();
  }, [mounted, pagination.page, filters]);

  useEffect(() => {
    loadTypes();
  }, []);

  // Salvar despesa
  const handleSaveExpense = async (data: ExpenseFormData) => {
    try {
      const url = editingExpense
        ? `/api/expenses/${editingExpense.id}`
        : "/api/expenses";
      const method = editingExpense ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save expense");
      }

      showToast(
        editingExpense ? "Despesa atualizada com sucesso!" : "Despesa criada com sucesso!",
        "success"
      );

      setIsFormOpen(false);
      setEditingExpense(undefined);
      loadExpenses();
    } catch (error) {
      console.error("Error saving expense:", error);
      showToast(
        error instanceof Error ? error.message : "Erro ao salvar despesa",
        "error"
      );
    }
  };

  // Excluir despesa
  const handleDeleteExpense = async () => {
    if (!deletingExpense) return;

    try {
      const response = await fetch(`/api/expenses/${deletingExpense.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete expense");
      }

      showToast("Despesa removida com sucesso!", "success");
      setDeletingExpense(undefined);
      loadExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      showToast(
        error instanceof Error ? error.message : "Erro ao remover despesa",
        "error"
      );
    }
  };

  // Aplicar filtros
  const applyFilters = () => {
    setPagination({ ...pagination, page: 1 });
    loadExpenses();
  };

  // Limpar filtros
  const clearFilters = () => {
    setFilters({
      typeId: "all",
      supplierTypeId: "all",
      startDate: "",
      endDate: "",
    });
  };

  // Funções do calendário
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Adicionar dias vazios do mês anterior
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Adicionar dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getExpensesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const expenseDateStr = expenseDate.toISOString().split('T')[0];
      return expenseDateStr === dateStr;
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const handleViewModeChange = (mode: 'list' | 'calendar') => {
    setViewMode(mode);
    localStorage.setItem('expenses-view-mode', mode);
  };

  const handleExpenseClick = (expense: ExpenseWithRelations) => {
    setSelectedExpense(expense);
    setIsSummaryModalOpen(true);
  };

  const handleEditFromSummary = () => {
    setIsSummaryModalOpen(false);
    setEditingExpense(selectedExpense || undefined);
    setIsFormOpen(true);
  };

  if (!mounted || (loading && expenses.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Gerenciamento de Despesas
          </h1>
          <p className="text-muted-foreground">Gerencie despesas, tipos e fornecedores</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('list')}
              className="h-8 px-3"
            >
              <List className="h-4 w-4 mr-1" />
              Tabela
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('calendar')}
              className="h-8 px-3"
            >
              <Grid3X3 className="h-4 w-4 mr-1" />
              Calendário
            </Button>
          </div>
          <div className="relative manage-menu-container">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => setIsManageMenuOpen(!isManageMenuOpen)}
            >
              <Settings className="h-4 w-4" />
              Gerenciar
              <ChevronDown className={`h-4 w-4 transition-transform ${isManageMenuOpen ? 'rotate-180' : ''}`} />
            </Button>
            
            {isManageMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setManageExpenseTypesOpen(true);
                      setIsManageMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  >
                    <Receipt className="h-4 w-4" />
                    Gerenciar Tipos de Despesa
                  </button>
                  <button
                    onClick={() => {
                      setManageSupplierTypesOpen(true);
                      setIsManageMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  >
                    <DollarSign className="h-4 w-4" />
                    Gerenciar Fornecedores
                  </button>
                </div>
              </div>
            )}
          </div>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Despesa
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <AnimatedCard className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            value={filters.typeId}
            onValueChange={(value: string) =>
              setFilters({ ...filters, typeId: value })
            }
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Tipo de despesa" />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="all">Todos os tipos</SelectItem>
              {expenseTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.supplierTypeId}
            onValueChange={(value: string) =>
              setFilters({ ...filters, supplierTypeId: value })
            }
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Tipo de fornecedor" />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="all">Todos os fornecedores</SelectItem>
              {supplierTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            placeholder="Data inicial"
            value={filters.startDate}
            onChange={(e) =>
              setFilters({ ...filters, startDate: e.target.value })
            }
            className="h-10"
          />

          <Input
            type="date"
            placeholder="Data final"
            value={filters.endDate}
            onChange={(e) =>
              setFilters({ ...filters, endDate: e.target.value })
            }
            className="h-10"
          />
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Button onClick={applyFilters} size="sm" className="h-9">
              <Filter className="h-4 w-4 mr-2" />
              Aplicar
            </Button>
            <Button onClick={clearFilters} variant="outline" size="sm" className="h-9">
              Limpar
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            {pagination.total} despesa(s) encontrada(s)
          </div>
        </div>
      </AnimatedCard>

      {/* Visualização de Calendário */}
      {viewMode === 'calendar' && (
        <AnimatedCard className="p-6">
          {/* Cabeçalho do Calendário */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {formatMonthYear(currentMonth)}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
                className="h-8 px-3"
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Dias da Semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendário */}
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(currentMonth).map((day, index) => {
              if (!day) {
                return <div key={index} className="h-24 border border-gray-100 rounded-lg"></div>;
              }

              const dayExpenses = getExpensesForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();
              const totalAmount = dayExpenses.reduce((sum, expense) => sum + expense.amountCents, 0);

              return (
                <div
                  key={day.toISOString()}
                  className={`h-24 border border-gray-200 rounded-lg p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isToday ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${
                      isToday ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {day.getDate()}
                    </span>
                    {totalAmount > 0 && (
                      <span className="text-xs font-medium text-green-600">
                        {formatCurrency(totalAmount)}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1 overflow-hidden">
                    {dayExpenses.slice(0, 2).map((expense) => (
                      <div
                        key={expense.id}
                        className="text-xs bg-orange-100 text-orange-800 px-1 py-0.5 rounded truncate cursor-pointer hover:bg-orange-200 transition-colors"
                        title={expense.supplierType.name}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExpenseClick(expense);
                        }}
                      >
                        {expense.supplierType.name.length > 15 
                          ? `${expense.supplierType.name.substring(0, 15)}...` 
                          : expense.supplierType.name}
                      </div>
                    ))}
                    {dayExpenses.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayExpenses.length - 2} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </AnimatedCard>
      )}

      {/* Tabela de despesas */}
      {viewMode === 'list' && (
        <AnimatedCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Descrição</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tipo</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Fornecedor</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Valor</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Data</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                          <Receipt className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{expense.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="text-xs">
                        {expense.type.name}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="subtle" className="text-xs">
                        {expense.supplierType.name}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        {formatCurrency(expense.amountCents)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {formatDate(expense.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ExpenseActionsMenu
                        onEdit={() => {
                          setEditingExpense(expense);
                          setIsFormOpen(true);
                        }}
                        onDelete={() => setDeletingExpense(expense)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnimatedCard>
      )}

      {/* Estado vazio para tabela */}
      {viewMode === 'list' && expenses.length === 0 && !loading && (
        <AnimatedCard className="p-8 text-center">
          <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma despesa encontrada</h3>
          <p className="text-muted-foreground mb-4">
            {Object.values(filters).some((f) => f !== "")
              ? "Tente ajustar os filtros de busca"
              : "Comece registrando sua primeira despesa"}
          </p>
          {!Object.values(filters).some((f) => f !== "") && (
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Primeira Despesa
            </Button>
          )}
        </AnimatedCard>
      )}

      {/* Paginação */}
      {viewMode === 'list' && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() =>
              setPagination({ ...pagination, page: pagination.page - 1 })
            }
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Página {pagination.page} de {pagination.totalPages}
            </span>
          </div>

          <Button
            variant="outline"
            onClick={() =>
              setPagination({ ...pagination, page: pagination.page + 1 })
            }
            disabled={pagination.page === pagination.totalPages}
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Formulário */}
      <ExpenseFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingExpense(undefined);
        }}
        onSave={handleSaveExpense}
        expense={editingExpense}
        title={editingExpense ? "Editar Despesa" : "Nova Despesa"}
        expenseTypes={expenseTypes}
        supplierTypes={supplierTypes}
      />

      <ManageExpenseTypesDialog
        isOpen={manageExpenseTypesOpen}
        onClose={() => setManageExpenseTypesOpen(false)}
        onChanged={() => loadTypes()}
      />

      <ManageSupplierTypesDialog
        isOpen={manageSupplierTypesOpen}
        onClose={() => setManageSupplierTypesOpen(false)}
        onChanged={() => loadTypes()}
      />

      {/* Balão Flutuante de Resumo da Despesa */}
      {isSummaryModalOpen && selectedExpense && (
        <div 
          className="fixed inset-0 z-30 pointer-events-auto"
          onClick={() => setIsSummaryModalOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl border border-gray-200/50 p-6 max-w-sm w-80 relative">
              {/* Seta do balão */}
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white/95 rotate-45 border-l border-t border-gray-200/50"></div>
              
              {/* Header compacto */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <Receipt className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {selectedExpense.description.length > 25 
                        ? `${selectedExpense.description.substring(0, 25)}...` 
                        : selectedExpense.description}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {formatDate(selectedExpense.date)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSummaryModalOpen(false)}
                  className="h-6 w-6 rounded-full hover:bg-gray-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {/* Conteúdo compacto */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Valor</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(selectedExpense.amountCents)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Tipo</span>
                  <Badge variant="outline" className="text-xs">
                    {selectedExpense.type.name}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Fornecedor</span>
                  <Badge variant="subtle" className="text-xs">
                    {selectedExpense.supplierType.name}
                  </Badge>
                </div>
              </div>

              {/* Ações compactas */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSummaryModalOpen(false)}
                  className="text-xs h-8 border-gray-300 hover:bg-gray-50 text-gray-600 hover:text-gray-700"
                >
                  <X className="h-3 w-3 mr-1" />
                  Fechar
                </Button>
                <Button
                  size="sm"
                  onClick={handleEditFromSummary}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setIsSummaryModalOpen(false);
                    setDeletingExpense(selectedExpense);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs h-8"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Remover
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirmação de exclusão */}
      <ConfirmDialog
        open={!!deletingExpense}
        onOpenChange={(open) => !open && setDeletingExpense(undefined)}
        onConfirm={handleDeleteExpense}
        title="Remover Despesa"
        description={`Tem certeza que deseja remover a despesa "${deletingExpense?.description}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
