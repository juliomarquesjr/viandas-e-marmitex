"use client";

import { motion } from "framer-motion";
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    DollarSign,
    Edit,
    Filter,
    MoreVertical,
    Plus,
    Receipt,
    Search,
    Trash2,
    X,
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
  return new Date(date).toLocaleDateString("pt-BR");
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
    } else {
      setFormData({
        typeId: "",
        supplierTypeId: "",
        amountCents: 0,
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
    }
  }, [expense, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.typeId || !formData.supplierTypeId || !formData.description.trim()) return;
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Tipo de Despesa *
            </label>
            <Select
              value={formData.typeId}
              onValueChange={(value: string) =>
                setFormData({ ...formData, typeId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {expenseTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Tipo de Fornecedor *
            </label>
            <Select
              value={formData.supplierTypeId}
              onValueChange={(value: string) =>
                setFormData({ ...formData, supplierTypeId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o fornecedor" />
              </SelectTrigger>
              <SelectContent>
                {supplierTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Valor (R$) *
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.amountCents / 100}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  amountCents: Math.round(parseFloat(e.target.value || "0") * 100),
                })
              }
              placeholder="0,00"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Descrição *
            </label>
            <Input
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Descrição da despesa"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Data *
            </label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
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
    search: "",
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
  const { showToast } = useToast();

  // Evitar hydration mismatch e inicializar datas apenas no cliente
  useEffect(() => {
    setMounted(true);
  }, []);

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
      search: "",
      typeId: "all",
      supplierTypeId: "all",
      startDate: "",
      endDate: "",
    });
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
          <Button
            variant="outline"
            onClick={() => setManageExpenseTypesOpen(true)}
          >
            Gerenciar Tipos
          </Button>
          <Button
            variant="outline"
            onClick={() => setManageSupplierTypesOpen(true)}
          >
            Gerenciar Fornecedores
          </Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Despesa
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <AnimatedCard className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar descrição..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              className="pl-10 h-10"
            />
          </div>

          <Select
            value={filters.typeId}
            onValueChange={(value: string) =>
              setFilters({ ...filters, typeId: value })
            }
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Tipo de despesa" />
            </SelectTrigger>
            <SelectContent>
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
            <SelectContent>
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

      {/* Lista de despesas */}
      <div className="grid gap-4">
        {expenses.map((expense) => (
          <div key={expense.id} className="rounded-xl border border-gray-200 p-4 bg-white">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center">
                  <Receipt className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900">{expense.description}</h3>
                    <Badge variant="outline">{expense.type.name}</Badge>
                    <Badge variant="subtle">{expense.supplierType.name}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {formatCurrency(expense.amountCents)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(expense.date)}
                    </span>
                  </div>
                </div>
              </div>
              <ExpenseActionsMenu
                onEdit={() => {
                  setEditingExpense(expense);
                  setIsFormOpen(true);
                }}
                onDelete={() => setDeletingExpense(expense)}
              />
            </div>
          </div>
        ))}

        {expenses.length === 0 && !loading && (
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
      </div>

      {/* Paginação */}
      {pagination.totalPages > 1 && (
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
