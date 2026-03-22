"use client";

import { InvoiceDataDisplay } from "@/app/components/InvoiceDataDisplay";
import { QRScannerModal } from "@/app/components/QRScannerModal";
import { InvoiceData } from "@/lib/nf-scanner/types";
import { extractChaveAcesso } from "@/lib/nf-scanner/utils";
import { useEffect, useState } from "react";

interface ExpenseInvoiceLookupDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ExpenseLookupResponse {
  expenses?: Array<{
    nfQrCodeUrl?: string | null;
  }>;
}

function isUrlValue(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

export function ExpenseInvoiceLookupDialog({
  open,
  onClose,
}: ExpenseInvoiceLookupDialogProps) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

  useEffect(() => {
    if (open) {
      setScannerOpen(true);
      return;
    }

    setScannerOpen(false);
    setInvoiceData(null);
  }, [open]);

  const handleBarcodeLookup = async (raw: string): Promise<InvoiceData> => {
    const chaveAcesso = extractChaveAcesso(raw);

    if (!chaveAcesso) {
      throw new Error(
        "Nao foi possivel identificar a chave de acesso a partir do barcode informado."
      );
    }

    let lookupUrl: string | undefined;

    const expenseResponse = await fetch(
      `/api/expenses?nfChaveAcesso=${encodeURIComponent(chaveAcesso)}&limit=1`
    );

    if (expenseResponse.ok) {
      const expensePayload = (await expenseResponse.json()) as ExpenseLookupResponse;
      lookupUrl = expensePayload.expenses?.[0]?.nfQrCodeUrl ?? undefined;
    }

    if (!lookupUrl && isUrlValue(raw)) {
      lookupUrl = raw;
    }

    const params = new URLSearchParams({ chave: chaveAcesso });
    if (lookupUrl) {
      params.set("url", lookupUrl);
    }

    const response = await fetch(`/api/nf-scanner/consulta?${params.toString()}`);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.data) {
      throw new Error(
        typeof payload.error === "string"
          ? payload.error
          : "Nao foi possivel consultar a nota fiscal."
      );
    }

    return payload.data as InvoiceData;
  };

  const handleLookupSuccess = (data: InvoiceData) => {
    setInvoiceData(data);
    setScannerOpen(false);
  };

  const handleScannerClose = () => {
    setScannerOpen(false);
    onClose();
  };

  const handleInvoiceClose = () => {
    setInvoiceData(null);
    onClose();
  };

  return (
    <>
      <QRScannerModal
        isOpen={open && scannerOpen}
        onClose={handleScannerClose}
        onQRCodeScanned={handleLookupSuccess}
        onBarcodeSubmit={handleBarcodeLookup}
        initialMode="barcode"
        availableModes={["barcode"]}
        closeOnSuccess={false}
        title="Verificar Nota Fiscal"
        description="Leia ou cole o barcode da nota para localizar um registro ja existente ou consultar a SEFAZ."
        barcodeAriaLabel="Barcode ou URL da nota fiscal"
        barcodeSubmitLabel="Verificar nota"
      />

      {open && invoiceData && (
        <InvoiceDataDisplay
          readOnly
          invoiceData={invoiceData}
          onClose={handleInvoiceClose}
        />
      )}
    </>
  );
}
