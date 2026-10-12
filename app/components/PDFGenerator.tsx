"use client";

import { useToast } from '@/app/components/Toast';
import { Button } from '@/app/components/ui/button';
import { PDFGenerator } from '@/lib/pdf-generator';
import { Download, Loader2, Send } from 'lucide-react';
import { useState } from 'react';

interface PDFGeneratorProps {
  customerId: string;
  startDate: string;
  endDate: string;
  customerName: string;
  onPDFGenerated?: (pdfBlob: Blob) => void;
  /** Abre a janela que mostra o PDF e envia ao cliente (WhatsApp e/ou e-mail). */
  onOpenSend?: () => void;
  /** Sem como enviar (cliente sem WhatsApp nem e-mail): o botão fica desligado e este texto explica. */
  sendDisabledReason?: string | null;
  /** O que o resumo do PDF mostra (as mesmas opções da impressão). */
  show?: { debt?: boolean; period?: boolean; payments?: boolean };
}

export function PDFGeneratorComponent({
  customerId,
  startDate,
  endDate,
  customerName,
  onPDFGenerated,
  onOpenSend,
  sendDisabledReason = null,
  show,
}: PDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { showToast } = useToast();

  const handleGeneratePDF = async () => {
    try {
      setIsGenerating(true);
      showToast("Gerando PDF...", "info");

      // Gerar PDF usando jsPDF
      const pdfBlob = await PDFGenerator.generateCustomerClosingReport(
        customerId,
        startDate,
        endDate,
        {
          filename: `relatorio-fechamento-${customerName.replace(/\s+/g, '-').toLowerCase()}-${startDate}-${endDate}.pdf`,
          show
        }
      );

      // Callback para componente pai
      if (onPDFGenerated) {
        onPDFGenerated(pdfBlob);
      }

      showToast("PDF gerado com sucesso!", "success");
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      showToast("Erro ao gerar PDF", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGenerating(true);
      showToast("Gerando PDF para download...", "info");

      // Gerar PDF
      const pdfBlob = await PDFGenerator.generateCustomerClosingReport(
        customerId,
        startDate,
        endDate,
        {
          filename: `relatorio-fechamento-${customerName.replace(/\s+/g, '-').toLowerCase()}-${startDate}-${endDate}.pdf`,
          show
        }
      );

      // Criar link de download
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-fechamento-${customerName.replace(/\s+/g, '-').toLowerCase()}-${startDate}-${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast("PDF baixado com sucesso!", "success");
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      showToast("Erro ao baixar PDF", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Button
          onClick={handleDownloadPDF}
          disabled={isGenerating}
          variant="outline"
          className="flex-1 h-10 flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Baixar PDF
        </Button>

        {onOpenSend && (
          <Button
            onClick={onOpenSend}
            disabled={isGenerating || Boolean(sendDisabledReason)}
            className="flex-1 h-10 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Send className="h-4 w-4" />
            Visualizar e enviar
          </Button>
        )}
      </div>
      {onOpenSend && sendDisabledReason && (
        <p className="text-center text-xs text-slate-400">{sendDisabledReason}</p>
      )}
    </div>
  );
}
