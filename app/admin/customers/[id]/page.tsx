"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { BudgetModal } from "../../../components/BudgetModal";
import { CustomerPresetModal } from "../../../components/CustomerPresetModal";
import { DeleteConfirmDialog } from "../../../components/DeleteConfirmDialog";

// Utils
import { formatCurrency, formatDate, getStatusInfo, getPaymentMethodLabel, getPaymentMethodIcon } from "./constants";

// Hooks
import { useCustomerData } from "./hooks/useCustomerData";
import { useCustomerOrders } from "./hooks/useCustomerOrders";
import { useCustomerActions } from "./hooks/useCustomerActions";
import { useClosingReport } from "./hooks/useClosingReport";

// Components
import { CustomerProfile } from "./components/CustomerProfile";
import { ConsumptionChart } from "./components/ConsumptionChart";
import { CustomerMetrics } from "./components/CustomerMetrics";
import { CustomerActions } from "./components/CustomerActions";
import { PurchaseHistory } from "./components/PurchaseHistory";
import { PaymentDialog } from "./components/dialogs/PaymentDialog";
import { ClosingReportDialog } from "./components/dialogs/ClosingReportDialog";
import { Button } from "../../../components/ui/button";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  // Modals state
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<{ id: string, isFichaPayment: boolean } | null>(null);

  // Custom Hooks
  const { customer, orders, stats, loading, error, loadCustomer, setOrders, calculateStats } = useCustomerData(customerId);

  const {
    orderFilter, customStartDate, customEndDate,
    filteredOrders, filteredStats, currentPage, itemsPerPage,
    handleFilterChange, setCustomStartDate, setCustomEndDate, setCurrentPage
  } = useCustomerOrders(orders);

  const {
    isDeleting, isProcessingPayment,
    confirmDeleteOrder, handleFichaPayment, downloadBarcode
  } = useCustomerActions(
    customer,
    loadCustomer,
    (deletedOrderId, isFichaPayment) => {
      setOrders((prev) => prev.filter((order) => order.id !== deletedOrderId));
      if (isFichaPayment) {
        loadCustomer();
      } else {
        calculateStats(orders.filter((order) => order.id !== deletedOrderId), stats.balanceAmount);
      }
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    }
  );

  const {
    config: reportConfig,
    setStartDate,
    setEndDate,
    setShowDebtBalance,
    setShowPeriodBalance,
    setShowPaymentsTotal,
    setDefaultDates,
    handleGenerateReport,
  } = useClosingReport(customer);

  useEffect(() => {
    if (customerId) {
      loadCustomer();
    }
  }, [customerId, loadCustomer]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-gray-600">Carregando informações do cliente...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar cliente</h3>
          <p className="text-gray-600 mb-4">{error || "Cliente não encontrado"}</p>
          <Button onClick={() => router.back()} className="bg-primary hover:bg-primary/90">Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CustomerProfile
        customer={customer}
        onBack={() => router.back()}
        downloadBarcode={downloadBarcode}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CustomerMetrics
          stats={stats}
          filteredStats={filteredStats}
          orderFilter={orderFilter}
        />
        <CustomerActions
          onOpenPaymentDialog={() => setIsPaymentDialogOpen(true)}
          onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
          onOpenPresetModal={() => setIsPresetModalOpen(true)}
          onOpenReportDialog={() => setIsReportDialogOpen(true)}
        />
      </div>

      <ConsumptionChart orders={orders} />

      <PurchaseHistory
        orders={orders}
        filteredOrders={filteredOrders}
        orderFilter={orderFilter}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        onFilterChange={handleFilterChange}
        onCustomStartDateChange={setCustomStartDate}
        onCustomEndDateChange={setCustomEndDate}
        onPageChange={setCurrentPage}
        onOpenDeleteDialog={(orderId) => {
          const order = orders.find(o => o.id === orderId);
          setOrderToDelete({ id: orderId, isFichaPayment: order?.type === "ficha_payment" || order?.paymentMethod === "ficha_payment" });
          setDeleteDialogOpen(true);
        }}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        getStatusInfo={getStatusInfo}
        getPaymentMethodIcon={getPaymentMethodIcon}
        getPaymentMethodLabel={getPaymentMethodLabel}
      />

      {/* Dialogs & Modals */}
      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        isProcessingPayment={isProcessingPayment}
        onSubmit={handleFichaPayment}
      />

      <ClosingReportDialog
        isOpen={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        customer={customer}
        config={reportConfig}
        setStartDate={setStartDate}
        setEndDate={setEndDate}
        setShowDebtBalance={setShowDebtBalance}
        setShowPeriodBalance={setShowPeriodBalance}
        setShowPaymentsTotal={setShowPaymentsTotal}
        setDefaultDates={setDefaultDates}
        generateReport={handleGenerateReport}
        onSendEmailSuccess={() => setIsReportDialogOpen(false)}
      />

      {isBudgetModalOpen && (
        <BudgetModal
          isOpen={isBudgetModalOpen}
          onClose={() => setIsBudgetModalOpen(false)}
          customerId={customer.id}
          customerName={customer.name}
        />
      )}

      {isPresetModalOpen && (
        <CustomerPresetModal
          isOpen={isPresetModalOpen}
          onClose={() => setIsPresetModalOpen(false)}
          customerId={customer.id}
          customerName={customer.name}
        />
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Confirmar Exclusão"
        description={
          orderToDelete?.isFichaPayment
            ? "Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita."
            : "Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita."
        }
        onConfirm={() => orderToDelete && confirmDeleteOrder(orderToDelete.id, orderToDelete.isFichaPayment)}
        confirmText="Excluir"
        cancelText="Cancelar"
        isLoading={isDeleting}
      />
    </div>
  );
}
