import { BarChart3 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";

interface ProfitEmptyStateProps {
  onOpenDialog: () => void;
}

export function ProfitEmptyState({ onOpenDialog }: ProfitEmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <BarChart3 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          Nenhum relatório gerado
        </h3>
        <p className="text-slate-500 mb-4">
          Clique em "Gerar Relatório" para ver a análise completa de lucros
        </p>
        <Button onClick={onOpenDialog}>
          <BarChart3 className="h-4 w-4 mr-2" />
          Gerar Primeiro Relatório
        </Button>
      </CardContent>
    </Card>
  );
}
