import { Calculator, Package, Plus, FileText } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../../../components/ui/card";

interface CustomerActionsProps {
  onOpenPaymentDialog: () => void;
  onOpenBudgetModal: () => void;
  onOpenPresetModal: () => void;
  onOpenReportDialog: () => void;
}

export function CustomerActions({
  onOpenPaymentDialog,
  onOpenBudgetModal,
  onOpenPresetModal,
  onOpenReportDialog,
}: CustomerActionsProps) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-slate-700">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {/* Adicionar Pagamento */}
        <Button 
          className="w-full justify-start gap-3 h-10" 
          size="sm"
          onClick={onOpenPaymentDialog}
        >
          <div className="h-6 w-6 rounded-md bg-white/20 flex items-center justify-center shrink-0">
            <Plus className="h-3.5 w-3.5" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold leading-tight">Adicionar Pagamento</p>
          </div>
        </Button>

        {/* Gerar Orçamento */}
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-3 h-10 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
          onClick={onOpenBudgetModal}
        >
          <div className="h-6 w-6 rounded-md bg-purple-100 flex items-center justify-center shrink-0">
            <Calculator className="h-3.5 w-3.5 text-purple-600" />
          </div>
          <p className="text-xs font-semibold leading-tight">Gerar Orçamento</p>
        </Button>

        {/* Presets de Produtos */}
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-3 h-10 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
          onClick={onOpenPresetModal}
        >
          <div className="h-6 w-6 rounded-md bg-emerald-100 flex items-center justify-center shrink-0">
            <Package className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <p className="text-xs font-semibold leading-tight">Presets de Produtos</p>
        </Button>

        {/* Relatório de Fechamento */}
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-3 h-10 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
          onClick={onOpenReportDialog}
        >
          <div className="h-6 w-6 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
            <FileText className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <p className="text-xs font-semibold leading-tight">Relatório de Fechamento</p>
        </Button>
      </CardContent>
    </Card>
  );
}
