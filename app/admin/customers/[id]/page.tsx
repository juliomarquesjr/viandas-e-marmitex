"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";

import { BudgetModal } from "../../../components/BudgetModal";
import { CustomerFormDialog } from "../../../components/CustomerFormDialog";
import { CustomerPresetModal } from "../../../components/CustomerPresetModal";
import { DeleteConfirmDialog } from "../../../components/DeleteConfirmDialog";
import { Button } from "../../../components/ui/button";

import { useCustomerData } from "./hooks/useCustomerData";
import { useCustomerActions } from "./hooks/useCustomerActions";
import { useCustomerEdit } from "./hooks/useCustomerEdit";
import { useClosingReport } from "./hooks/useClosingReport";
import { useCycles } from "./hooks/useCycles";

import { buildPreviewUrl, buildWhatsappUrl } from "./lib/billingMessage";
import type { LedgerEntry } from "./lib/cycle";

import { CycleHeader } from "./components/cycle/CycleHeader";
import { CycleStepper } from "./components/cycle/CycleStepper";
import { ConsumptionCalendar } from "./components/cycle/ConsumptionCalendar";
import { CycleLedger } from "./components/cycle/CycleLedger";
import { InvoicePanel } from "./components/cycle/InvoicePanel";
import { PreviousCycles } from "./components/cycle/PreviousCycles";
import { PaymentDialog } from "./components/dialogs/PaymentDialog";
import { ClosingReportDialog } from "./components/dialogs/ClosingReportDialog";

/**
 * A ficha do cliente como ciclo mensal.
 *
 * O negócio fecha por mês, então a tela também: uma competência por vez, com o
 * consumo do mês visível de uma vez só, o extrato com saldo corrente e a fatura
 * — a única superfície colorida — concentrando a decisão.
 */
export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<LedgerEntry | null>(null);

  const { customer, orders, stats, loading, error, loadCustomer, setOrders, calculateStats } =
    useCustomerData(customerId);

  const {
    now,
    cycles,
    cycle,
    selectedKey,
    setSelectedKey,
    goPrevious,
    goNext,
    canGoPrevious,
    canGoNext,
    totalBalanceCents,
    previousCycles,
  } = useCycles(orders);

  const { isDeleting, isProcessingPayment, confirmDeleteOrder, handleFichaPayment, downloadBarcode } =
    useCustomerActions(customer, loadCustomer, (deletedOrderId, isFichaPayment) => {
      setOrders((prev) => prev.filter((order) => order.id !== deletedOrderId));
      if (isFichaPayment) {
        loadCustomer();
      } else {
        calculateStats(
          orders.filter((order) => order.id !== deletedOrderId),
          stats.balanceAmount
        );
      }
      setEntryToDelete(null);
    });

  const edit = useCustomerEdit(customer, loadCustomer);

  const {
    config: reportConfig,
    setStartDate,
    setEndDate,
    setShowDebtBalance,
    setShowPeriodBalance,
    setShowPaymentsTotal,
    setDefaultDates,
    handleGenerateReport,
    isLoadingLastEntry,
    fetchLastEntryDate,
  } = useClosingReport(customer);

  useEffect(() => {
    if (customerId) loadCustomer();
  }, [customerId, loadCustomer]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando a ficha do cliente…</p>
      </div>
    );
  }

  if (error || !customer || !cycle) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            Não foi possível abrir a ficha
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {error || "Cliente não encontrado."}
          </p>
          <Button onClick={() => router.push("/admin/customers")}>Voltar para clientes</Button>
        </div>
      </div>
    );
  }

  const openPreview = () => {
    window.open(buildPreviewUrl(customer.id, cycle), "_blank");
  };

  const sendWhatsApp = () => {
    const url = buildWhatsappUrl(customer, cycle, totalBalanceCents);
    if (url) window.open(url, "_blank");
  };

  return (
    <div className="flex flex-col gap-3.5 pb-20">
      <CycleHeader
        customer={customer}
        cycle={cycle}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        onPrevious={goPrevious}
        onNext={goNext}
        onBack={() => router.push("/admin/customers")}
        onEdit={edit.open}
        onOpenPresets={() => setIsPresetModalOpen(true)}
        onOpenBudget={() => setIsBudgetModalOpen(true)}
        onOpenReport={() => setIsReportDialogOpen(true)}
        onDownloadBarcode={downloadBarcode}
      />

      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3.5">
          <CycleStepper cycle={cycle} now={now} />
          <ConsumptionCalendar cycle={cycle} now={now} />
          <CycleLedger cycle={cycle} onDelete={setEntryToDelete} />
        </div>

        <div className="flex flex-col gap-3.5">
          <InvoicePanel
            cycle={cycle}
            totalBalanceCents={totalBalanceCents}
            onReceivePayment={() => setIsPaymentDialogOpen(true)}
            onPreview={openPreview}
            onSendWhatsApp={sendWhatsApp}
            hasPhone={Boolean(customer.phone?.trim())}
          />
          <PreviousCycles
            cycles={previousCycles}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
          />
        </div>
      </div>

      {/* ───────────────────────── Diálogos ───────────────────────── */}

      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        isProcessingPayment={isProcessingPayment}
        onSubmit={handleFichaPayment}
        balanceCents={totalBalanceCents}
        cycleOpenCents={cycle.openCents}
        cycleLabel={cycle.label}
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
        isLoadingLastEntry={isLoadingLastEntry}
        fetchLastEntryDate={fetchLastEntryDate}
      />

      <CustomerFormDialog
        open={edit.isOpen}
        onClose={edit.close}
        onSubmit={edit.handleSubmit}
        editingCustomer={customer}
        initialFormData={edit.initialFormData}
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
        open={entryToDelete !== null}
        onOpenChange={(open) => !open && setEntryToDelete(null)}
        title={entryToDelete?.kind === "pagamento" ? "Excluir pagamento" : "Excluir venda"}
        description={
          entryToDelete?.kind === "pagamento"
            ? "O pagamento some do extrato e o saldo da ficha volta a subir. Esta ação não pode ser desfeita."
            : "A venda some do extrato e deixa de ser cobrada. Esta ação não pode ser desfeita."
        }
        onConfirm={() =>
          entryToDelete &&
          confirmDeleteOrder(entryToDelete.id, entryToDelete.kind === "pagamento")
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        isLoading={isDeleting}
      />

      {/* O ciclo mais antigo delimita até onde a navegação de mês vai. */}
      <span className="sr-only" aria-live="polite">
        Competência {cycle.label}, {cycles.length} ciclos no histórico.
      </span>
    </div>
  );
}
