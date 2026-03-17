"use client";

import {
  ExpenseFormData,
  ExpensePaymentMethod,
  ExpenseType,
  ExpenseWithRelations,
  SupplierType,
} from "@/lib/types";
import { useToast } from "@/app/components/Toast";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ViewMode = "list" | "calendar";

export interface ExpensesState {
  // Data
  expenses: ExpenseWithRelations[];
  allExpenses: ExpenseWithRelations[];
  expenseTypes: ExpenseType[];
  supplierTypes: SupplierType[];
  paymentMethods: ExpensePaymentMethod[];
  // Pagination / grouping
  pagination: { page: number; limit: number; total: number; totalPages: number };
  monthsGrouped: [string, ExpenseWithRelations[]][];
  currentMonthIndex: number;
  setCurrentMonthIndex: (i: number) => void;
  // Filters
  filters: {
    typeId: string;
    supplierTypeId: string;
    paymentMethodId: string;
    startDate: string;
    endDate: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<ExpensesState["filters"]>>;
  applyFilters: () => void;
  clearFilters: () => void;
  // View
  viewMode: ViewMode;
  handleViewModeChange: (mode: ViewMode) => void;
  // Calendar
  currentMonth: Date;
  navigateMonth: (direction: "prev" | "next") => void;
  getDaysInMonth: (date: Date) => (Date | null)[];
  getExpensesForDate: (date: Date) => ExpenseWithRelations[];
  formatMonthYear: (date: Date) => string;
  // Dialog state
  isFormOpen: boolean;
  setIsFormOpen: (v: boolean) => void;
  editingExpense: ExpenseWithRelations | undefined;
  setEditingExpense: (e: ExpenseWithRelations | undefined) => void;
  deletingExpense: ExpenseWithRelations | undefined;
  setDeletingExpense: (e: ExpenseWithRelations | undefined) => void;
  isDeletingExpense: boolean;
  selectedExpense: ExpenseWithRelations | null;
  setSelectedExpense: (e: ExpenseWithRelations | null) => void;
  isSummaryModalOpen: boolean;
  setIsSummaryModalOpen: (v: boolean) => void;
  isManageMenuOpen: boolean;
  setIsManageMenuOpen: (v: boolean) => void;
  manageExpenseTypesOpen: boolean;
  setManageExpenseTypesOpen: (v: boolean) => void;
  manageSupplierTypesOpen: boolean;
  setManageSupplierTypesOpen: (v: boolean) => void;
  managePaymentMethodsOpen: boolean;
  setManagePaymentMethodsOpen: (v: boolean) => void;
  isReportModalOpen: boolean;
  setIsReportModalOpen: (v: boolean) => void;
  // Handlers
  loading: boolean;
  mounted: boolean;
  loadExpenses: () => Promise<void>;
  loadTypes: () => Promise<void>;
  handleSaveExpense: (data: ExpenseFormData) => Promise<void>;
  handleDeleteExpense: () => Promise<void>;
  handleExpenseClick: (expense: ExpenseWithRelations) => void;
  handleEditFromSummary: () => void;
}

export function useExpenses(): ExpensesState {
  const { showToast } = useToast();

  const [expenses, setExpenses] = useState<ExpenseWithRelations[]>([]);
  const [allExpenses, setAllExpenses] = useState<ExpenseWithRelations[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [supplierTypes, setSupplierTypes] = useState<SupplierType[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<ExpensePaymentMethod[]>([]);
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
    paymentMethodId: "all",
    startDate: "",
    endDate: "",
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [manageExpenseTypesOpen, setManageExpenseTypesOpen] = useState(false);
  const [manageSupplierTypesOpen, setManageSupplierTypesOpen] = useState(false);
  const [managePaymentMethodsOpen, setManagePaymentMethodsOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithRelations | undefined>();
  const [deletingExpense, setDeletingExpense] = useState<ExpenseWithRelations | undefined>();
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithRelations | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isManageMenuOpen, setIsManageMenuOpen] = useState(false);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [allExpensesForGrouping, setAllExpensesForGrouping] = useState<ExpenseWithRelations[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const groupExpensesByMonth = (list: ExpenseWithRelations[]) => {
    const grouped: { [key: string]: ExpenseWithRelations[] } = {};
    list.forEach((expense) => {
      const date = expense.date instanceof Date ? expense.date : new Date(expense.date);
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const key = `${year}-${String(month).padStart(2, "0")}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(expense);
    });
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
  };

  const monthsGrouped = useMemo(() => {
    if (viewMode === "list" && allExpensesForGrouping.length > 0) {
      return groupExpensesByMonth(allExpensesForGrouping);
    }
    return [];
  }, [viewMode, allExpensesForGrouping]);

  // Sync expenses with current month index in list mode
  React.useEffect(() => {
    if (viewMode === "list" && monthsGrouped.length > 0) {
      if (currentMonthIndex >= 0 && currentMonthIndex < monthsGrouped.length) {
        setExpenses(monthsGrouped[currentMonthIndex][1]);
        setPagination((prev) => ({ ...prev, totalPages: monthsGrouped.length }));
      }
    }
  }, [currentMonthIndex, monthsGrouped, viewMode]);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("expenses-view-mode");
    if (saved === "list" || saved === "calendar") setViewMode(saved);
  }, []);

  // Close manage menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isManageMenuOpen) {
        const target = e.target as Element;
        if (!target.closest(".manage-menu-container")) setIsManageMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isManageMenuOpen]);

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const normalized = {
        ...filters,
        typeId: filters.typeId === "all" ? "" : filters.typeId,
        supplierTypeId: filters.supplierTypeId === "all" ? "" : filters.supplierTypeId,
        paymentMethodId: filters.paymentMethodId === "all" ? "" : filters.paymentMethodId,
      };

      let limit = pagination.limit;
      let page = pagination.page;

      if (viewMode === "calendar") {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        normalized.startDate = new Date(year, month, 1).toISOString().split("T")[0];
        normalized.endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];
        limit = 1000;
      } else {
        limit = 10000;
        page = 1;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(Object.entries(normalized).filter(([_, v]) => v !== "")),
      });

      const response = await fetch(`/api/expenses?${params}`);
      if (!response.ok) throw new Error("Failed to fetch expenses");
      const data = await response.json();

      if (viewMode === "list") {
        setAllExpensesForGrouping(data.expenses);
        setAllExpenses(data.expenses);
        setCurrentMonthIndex(0);
        const grouped = groupExpensesByMonth(data.expenses);
        setExpenses(grouped.length > 0 ? grouped[0][1] : []);
        setPagination((prev) => ({
          ...prev,
          total: data.expenses.length,
          totalPages: grouped.length,
        }));
      } else {
        setExpenses(data.expenses);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error loading expenses:", error);
      showToast("Erro ao carregar despesas", "error");
    } finally {
      setLoading(false);
    }
  }, [filters, viewMode, currentMonth, pagination.limit, pagination.page]);

  const loadTypes = useCallback(async () => {
    try {
      const [typesRes, supplierRes, paymentRes] = await Promise.all([
        fetch("/api/expense-types"),
        fetch("/api/supplier-types"),
        fetch("/api/expense-payment-methods"),
      ]);
      if (typesRes.ok) setExpenseTypes(await typesRes.json());
      if (supplierRes.ok) setSupplierTypes(await supplierRes.json());
      if (paymentRes.ok) setPaymentMethods(await paymentRes.json());
    } catch (error) {
      console.error("Error loading types:", error);
      showToast("Erro ao carregar tipos", "error");
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    loadExpenses();
  }, [mounted, filters, viewMode, currentMonth]);

  useEffect(() => {
    loadTypes();
  }, []);

  const handleSaveExpense = async (data: ExpenseFormData) => {
    const url = editingExpense ? `/api/expenses/${editingExpense.id}` : "/api/expenses";
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
    showToast(editingExpense ? "Despesa atualizada!" : "Despesa criada!", "success");
    setIsFormOpen(false);
    setEditingExpense(undefined);
    loadExpenses();
  };

  const handleDeleteExpense = async () => {
    if (!deletingExpense) return;
    setIsDeletingExpense(true);
    try {
      const response = await fetch(`/api/expenses/${deletingExpense.id}`, { method: "DELETE" });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete expense");
      }
      showToast("Despesa removida com sucesso!", "success");
      setDeletingExpense(undefined);
      loadExpenses();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erro ao remover despesa", "error");
    } finally {
      setIsDeletingExpense(false);
    }
  };

  const applyFilters = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    setCurrentMonthIndex(0);
    loadExpenses();
  };

  const clearFilters = () => {
    setFilters({ typeId: "all", supplierTypeId: "all", paymentMethodId: "all", startDate: "", endDate: "" });
  };

  const getDaysInMonth = (date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  };

  const getExpensesForDate = (date: Date): ExpenseWithRelations[] => {
    const dateStr = date.toISOString().split("T")[0];
    return expenses.filter((e) => new Date(e.date).toISOString().split("T")[0] === dateStr);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1));
      return d;
    });
  };

  const formatMonthYear = (date: Date) =>
    date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setCurrentMonthIndex(0);
    localStorage.setItem("expenses-view-mode", mode);
  };

  const handleExpenseClick = (expense: ExpenseWithRelations) => {
    setSelectedExpense(expense);
    setIsSummaryModalOpen(true);
  };

  const handleEditFromSummary = () => {
    setIsSummaryModalOpen(false);
    setEditingExpense(selectedExpense ?? undefined);
    setIsFormOpen(true);
  };

  return {
    expenses,
    allExpenses,
    expenseTypes,
    supplierTypes,
    paymentMethods,
    pagination,
    monthsGrouped,
    currentMonthIndex,
    setCurrentMonthIndex,
    filters,
    setFilters,
    applyFilters,
    clearFilters,
    viewMode,
    handleViewModeChange,
    currentMonth,
    navigateMonth,
    getDaysInMonth,
    getExpensesForDate,
    formatMonthYear,
    isFormOpen,
    setIsFormOpen,
    editingExpense,
    setEditingExpense,
    deletingExpense,
    setDeletingExpense,
    isDeletingExpense,
    selectedExpense,
    setSelectedExpense,
    isSummaryModalOpen,
    setIsSummaryModalOpen,
    isManageMenuOpen,
    setIsManageMenuOpen,
    manageExpenseTypesOpen,
    setManageExpenseTypesOpen,
    manageSupplierTypesOpen,
    setManageSupplierTypesOpen,
    managePaymentMethodsOpen,
    setManagePaymentMethodsOpen,
    isReportModalOpen,
    setIsReportModalOpen,
    loading,
    mounted,
    loadExpenses,
    loadTypes,
    handleSaveExpense,
    handleDeleteExpense,
    handleExpenseClick,
    handleEditFromSummary,
  };
}
