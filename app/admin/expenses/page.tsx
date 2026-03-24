"use client";

import { PageHeader } from "@/app/admin/components/layout/PageHeader";
import { DeleteConfirmDialog } from "@/app/components/DeleteConfirmDialog";
import { Button } from "@/app/components/ui/button";
import {
  ChevronDown,
  ClipboardList,
  DollarSign,
  FileText,
  Grid3X3,
  List,
  Plus,
  Receipt,
  Truck,
  Wallet,
} from "lucide-react";
import { useRef, useState } from "react";
import { useExpenses } from "./hooks/useExpenses";
import { ExpenseCalendarView } from "./components/ExpenseCalendarView";
import { ExpenseFilters } from "./components/ExpenseFilters";
import { ExpenseFormDialog } from "./components/ExpenseFormDialog";
import { ExpenseInvoiceLookupDialog } from "./components/ExpenseInvoiceLookupDialog";
import { ExpenseListView } from "./components/ExpenseListView";
import { ExpenseReportModal } from "./components/ExpenseReportModal";
import { ExpenseStatsCards } from "./components/ExpenseStatsCards";
import { ExpenseSummaryModal } from "./components/ExpenseSummaryModal";
import { ManageExpenseTypesDialog } from "./components/ManageExpenseTypesDialog";
import { ManageExpensePaymentMethodsDialog } from "./components/ManageExpensePaymentMethodsDialog";
import { ManageSupplierTypesDialog } from "./components/ManageSupplierTypesDialog";
import { TeleDeliverySummaryModal } from "./components/TeleDeliverySummaryModal";
import {
  ExpenseListSkeleton,
  ExpenseCalendarSkeleton,
} from "./components/ExpenseSkeletonLoader";

export default function ExpensesPage() {
  const ex = useExpenses();
  const manageMenuRef = useRef<HTMLDivElement>(null);
  const [teleDeliverySummaryOpen, setTeleDeliverySummaryOpen] = useState(false);


  if (!ex.mounted || (ex.loading && ex.expenses.length === 0)) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Gerenciamento de Despesas"
          description="Gerencie despesas, tipos e fornecedores"
          icon={Receipt}
        />
        <div className="space-y-6">
          {ex.viewMode === "calendar" ? (
            <ExpenseCalendarSkeleton />
          ) : (
            <ExpenseListSkeleton />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <PageHeader
        title="Gerenciamento de Despesas"
        description="Gerencie despesas, tipos e fornecedores"
        icon={Receipt}
        actions={
          <div className="flex items-center gap-2">
            {/* Toggle lista / calendário — pill style */}
            <div className="flex items-center bg-slate-100 rounded-full p-1 gap-0.5">
              <button
                onClick={() => ex.handleViewModeChange("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                  ex.viewMode === "list"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Tabela
              </button>
              <button
                onClick={() => ex.handleViewModeChange("calendar")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                  ex.viewMode === "calendar"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
                Calendário
              </button>
            </div>

            {/* Cadastros auxiliares e relatório */}
            <div className="relative manage-menu-container" ref={manageMenuRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => ex.setIsManageMenuOpen(!ex.isManageMenuOpen)}
                className="gap-2"
              >
                <ClipboardList className="h-4 w-4" />
                Cadastros e relatórios
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-150 ${
                    ex.isManageMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
              {ex.isManageMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
                  <button
                    onClick={() => {
                      ex.setManageExpenseTypesOpen(true);
                      ex.setIsManageMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Receipt className="h-4 w-4 text-slate-400" />
                    Tipos de Despesa
                  </button>
                  <button
                    onClick={() => {
                      ex.setManageSupplierTypesOpen(true);
                      ex.setIsManageMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    Fornecedores
                  </button>
                  <button
                    onClick={() => {
                      ex.setManagePaymentMethodsOpen(true);
                      ex.setIsManageMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Wallet className="h-4 w-4 text-slate-400" />
                    Formas de Pagamento
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => {
                      ex.setIsInvoiceLookupOpen(true);
                      ex.setIsManageMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-slate-400" />
                    Verificar Nota Fiscal
                  </button>
                  <button
                    onClick={() => {
                      ex.setIsReportModalOpen(true);
                      ex.setIsManageMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-slate-400" />
                    Relatório de Despesas
                  </button>
                  <button
                    onClick={() => {
                      setTeleDeliverySummaryOpen(true);
                      ex.setIsManageMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Truck className="h-4 w-4 text-slate-400" />
                    Resumo de Tele Entrega
                  </button>
                </div>
              )}
            </div>

            <Button size="sm" onClick={() => ex.setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nova Despesa
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
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
            onEdit={(expense) => {
              ex.setEditingExpense(expense);
              ex.setIsFormOpen(true);
            }}
            onDelete={ex.setDeletingExpense}
            onNewExpense={() => ex.setIsFormOpen(true)}
            onExpenseClick={ex.handleExpenseClick}
          />
        )}
      </div>

      {/* Dialogs */}
      <ExpenseFormDialog
        open={ex.isFormOpen}
        onClose={() => {
          ex.setIsFormOpen(false);
          ex.setEditingExpense(undefined);
        }}
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

      <ExpenseInvoiceLookupDialog
        open={ex.isInvoiceLookupOpen}
        onClose={() => ex.setIsInvoiceLookupOpen(false)}
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

      <DeleteConfirmDialog
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

      <TeleDeliverySummaryModal
        open={teleDeliverySummaryOpen}
        onOpenChange={setTeleDeliverySummaryOpen}
      />
    </div>
  );
}
