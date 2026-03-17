"use client";

import { PageHeader } from "@/app/admin/components/layout/PageHeader";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { Button } from "@/app/components/ui/button";
import {
  ChevronDown,
  DollarSign,
  FileText,
  Grid3X3,
  List,
  Loader2,
  Plus,
  Receipt,
  Settings,
  Wallet,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useExpenses } from "./hooks/useExpenses";
import { ExpenseCalendarView } from "./components/ExpenseCalendarView";
import { ExpenseFilters } from "./components/ExpenseFilters";
import { ExpenseFormDialog } from "./components/ExpenseFormDialog";
import { ExpenseListView } from "./components/ExpenseListView";
import { ExpenseReportModal } from "./components/ExpenseReportModal";
import { ExpenseStatsCards } from "./components/ExpenseStatsCards";
import { ExpenseSummaryModal } from "./components/ExpenseSummaryModal";
import { ManageExpenseTypesDialog } from "./components/ManageExpenseTypesDialog";
import { ManageExpensePaymentMethodsDialog } from "./components/ManageExpensePaymentMethodsDialog";
import { ManageSupplierTypesDialog } from "./components/ManageSupplierTypesDialog";

export default function ExpensesPage() {
  const ex = useExpenses();
  const manageMenuRef = useRef<HTMLDivElement>(null);

  if (!ex.mounted || (ex.loading && ex.expenses.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho padrão do sistema */}
      <PageHeader
        title="Gerenciamento de Despesas"
        description="Gerencie despesas, tipos e fornecedores"
        icon={Receipt}
        actions={
          <div className="flex items-center gap-2">
            {/* Toggle lista / calendário */}
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1">
              <Button
                variant={ex.viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => ex.handleViewModeChange("list")}
                className="h-8 px-3"
              >
                <List className="h-4 w-4 mr-1" />
                Tabela
              </Button>
              <Button
                variant={ex.viewMode === "calendar" ? "default" : "ghost"}
                size="sm"
                onClick={() => ex.handleViewModeChange("calendar")}
                className="h-8 px-3"
              >
                <Grid3X3 className="h-4 w-4 mr-1" />
                Calendário
              </Button>
            </div>

            {/* Gerenciar dropdown */}
            <div className="relative manage-menu-container" ref={manageMenuRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => ex.setIsManageMenuOpen(!ex.isManageMenuOpen)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Gerenciar
                <ChevronDown className={`h-4 w-4 transition-transform ${ex.isManageMenuOpen ? "rotate-180" : ""}`} />
              </Button>
              {ex.isManageMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                  <button
                    onClick={() => { ex.setManageExpenseTypesOpen(true); ex.setIsManageMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Receipt className="h-4 w-4 text-slate-400" />
                    Tipos de Despesa
                  </button>
                  <button
                    onClick={() => { ex.setManageSupplierTypesOpen(true); ex.setIsManageMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    Fornecedores
                  </button>
                  <button
                    onClick={() => { ex.setManagePaymentMethodsOpen(true); ex.setIsManageMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Wallet className="h-4 w-4 text-slate-400" />
                    Formas de Pagamento
                  </button>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => ex.setIsReportModalOpen(true)}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Relatório
            </Button>

            <Button size="sm" onClick={() => ex.setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nova Despesa
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <ExpenseStatsCards
          expenses={ex.expenses}
          expenseTypes={ex.expenseTypes}
          paymentMethods={ex.paymentMethods}
        />

        {/* Filtros */}
        <ExpenseFilters
          filters={ex.filters}
          setFilters={ex.setFilters}
          expenseTypes={ex.expenseTypes}
          supplierTypes={ex.supplierTypes}
          paymentMethods={ex.paymentMethods}
          totalCount={ex.pagination.total}
          onApply={ex.applyFilters}
          onClear={ex.clearFilters}
        />

        {/* View */}
        {ex.viewMode === "calendar" ? (
          <ExpenseCalendarView
            currentMonth={ex.currentMonth}
            expenses={ex.expenses}
            onNavigateMonth={ex.navigateMonth}
            onGoToToday={() => ex.navigateMonth("next")}
            getDaysInMonth={ex.getDaysInMonth}
            getExpensesForDate={ex.getExpensesForDate}
            formatMonthYear={ex.formatMonthYear}
            onExpenseClick={ex.handleExpenseClick}
          />
        ) : (
          <ExpenseListView
            monthsGrouped={ex.monthsGrouped}
            currentMonthIndex={ex.currentMonthIndex}
            onMonthChange={ex.setCurrentMonthIndex}
            onEdit={(expense) => { ex.setEditingExpense(expense); ex.setIsFormOpen(true); }}
            onDelete={ex.setDeletingExpense}
            onNewExpense={() => ex.setIsFormOpen(true)}
          />
        )}
      </div>

      {/* Dialogs */}
      <ExpenseFormDialog
        open={ex.isFormOpen}
        onClose={() => { ex.setIsFormOpen(false); ex.setEditingExpense(undefined); }}
        onSave={ex.handleSaveExpense}
        expense={ex.editingExpense}
        expenseTypes={ex.expenseTypes}
        supplierTypes={ex.supplierTypes}
        paymentMethods={ex.paymentMethods}
      />

      <ExpenseReportModal
        open={ex.isReportModalOpen}
        onClose={() => ex.setIsReportModalOpen(false)}
        supplierTypes={ex.supplierTypes}
      />

      <ExpenseSummaryModal
        open={ex.isSummaryModalOpen}
        expense={ex.selectedExpense}
        onClose={() => ex.setIsSummaryModalOpen(false)}
        onEdit={ex.handleEditFromSummary}
        onDelete={() => {
          ex.setIsSummaryModalOpen(false);
          ex.setDeletingExpense(ex.selectedExpense ?? undefined);
        }}
      />

      <ConfirmDialog
        open={!!ex.deletingExpense}
        onOpenChange={(open) => !open && ex.setDeletingExpense(undefined)}
        onConfirm={ex.handleDeleteExpense}
        title="Remover Despesa"
        description={`Tem certeza que deseja remover a despesa "${ex.deletingExpense?.description}"? Esta ação não pode ser desfeita.`}
        isLoading={ex.isDeletingExpense}
      />

      <ManageExpenseTypesDialog
        isOpen={ex.manageExpenseTypesOpen}
        onClose={() => ex.setManageExpenseTypesOpen(false)}
        onChanged={ex.loadTypes}
      />

      <ManageSupplierTypesDialog
        isOpen={ex.manageSupplierTypesOpen}
        onClose={() => ex.setManageSupplierTypesOpen(false)}
        onChanged={ex.loadTypes}
      />

      <ManageExpensePaymentMethodsDialog
        isOpen={ex.managePaymentMethodsOpen}
        onClose={() => ex.setManagePaymentMethodsOpen(false)}
        onChanged={ex.loadTypes}
      />
    </div>
  );
}
