"use client";

import { useToast } from '@/app/components/Toast';
import { Button } from '@/app/components/ui/button';
import { PDFGenerator } from '@/lib/pdf-generator';
import { Download, FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface PDFGeneratorProps {
  customerId: string;
  startDate: string;
  endDate: string;
  customerName: string;
  onPDFGenerated?: (pdfBlob: Blob) => void;
  onSendEmail?: (pdfBase64: string) => void;
  showSendButton?: boolean;
}

export function PDFGeneratorComponent({
  customerId,
  startDate,
  endDate,
  customerName,
  onPDFGenerated,
  onSendEmail,
  showSendButton = false
}: PDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
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
          filename: `relatorio-fechamento-${customerName.replace(/\s+/g, '-').toLowerCase()}-${startDate}-${endDate}.pdf`
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

  const handleGenerateAndSend = async () => {
    try {
      setIsSending(true);
      showToast("Gerando PDF e enviando por email...", "info");

      // Validar dados
      if (!customerId || !startDate || !endDate) {
        throw new Error('Dados obrigatórios não fornecidos');
      }

      console.log('Gerando PDF para:', { customerId, startDate, endDate, customerName });

      // Gerar PDF
      const pdfBlob = await PDFGenerator.generateCustomerClosingReport(
        customerId,
        startDate,
        endDate,
        {
          filename: `relatorio-fechamento-${customerName.replace(/\s+/g, '-').toLowerCase()}-${startDate}-${endDate}.pdf`
        }
      );

      console.log('PDF gerado com sucesso, tamanho:', pdfBlob.size);

      // Converter para base64
      const pdfBase64 = await PDFGenerator.blobToBase64(pdfBlob);
      console.log('PDF convertido para base64, tamanho:', pdfBase64.length);

      // Enviar por email
      const url = `/api/customers/${customerId}/send-closing-report-pdf?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      console.log('Enviando para API:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfBase64
        })
      });

      console.log('Resposta da API:', response.status, response.statusText);

      const result = await response.json();
      console.log('Resultado:', result);

      if (response.ok) {
        showToast(`Relatório com PDF enviado para o cliente!`, "success");
        if (onSendEmail) {
          onSendEmail(pdfBase64);
        }
      } else {
        showToast(result.error || "Erro ao enviar relatório", "error");
      }
    } catch (error) {
      console.error('Erro detalhado ao gerar e enviar PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      showToast(`Erro ao gerar e enviar PDF: ${errorMessage}`, "error");
    } finally {
      setIsSending(false);
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
          filename: `relatorio-fechamento-${customerName.replace(/\s+/g, '-').toLowerCase()}-${startDate}-${endDate}.pdf`
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
    <div className="flex gap-2">
      <Button
        onClick={handleDownloadPDF}
        disabled={isGenerating || isSending}
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

      {showSendButton && (
        <Button
          onClick={handleGenerateAndSend}
          disabled={isGenerating || isSending}
          className="flex-1 h-10 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Enviar por Email
        </Button>
      )}
    </div>
  );
}
