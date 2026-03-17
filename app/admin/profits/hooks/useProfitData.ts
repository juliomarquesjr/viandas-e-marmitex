import { useState } from "react";
import { ProfitReportData } from "../../../../lib/types";

// Tipagem para a função de exibir toasts injetada do exterior (para evitar prender o hook no contexto direto, 
// embora também pudéssemos usar `useToast` diretamente aqui).
interface UseProfitDataProps {
  showToast: (message: string, type: "success" | "error" | "warning" | "info") => void;
}

export function useProfitData({ showToast }: UseProfitDataProps) {
  const [reportData, setReportData] = useState<ProfitReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchReport = async (startDate: string, endDate: string) => {
    if (!startDate || !endDate) {
      showToast("Por favor, selecione as datas inicial e final", "error");
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`/api/reports/profits?${params}`);
      
      if (!response.ok) {
        throw new Error("Failed to generate report");
      }
      
      const data = await response.json();
      setReportData(data);
      setIsDialogOpen(false);
      showToast("Relatório gerado com sucesso!", "success");
    } catch (error) {
      console.error("Error generating report:", error);
      showToast("Erro ao gerar relatório", "error");
    } finally {
      setLoading(false);
    }
  };

  return {
    reportData,
    loading,
    isDialogOpen,
    setIsDialogOpen,
    fetchReport,
  };
}
