import { AlertCircle, Trash2, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface DeleteProductDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteProductDialog({
  open,
  onClose,
  onConfirm,
  isLoading = false,
}: DeleteProductDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white shadow-2xl border-0">
        <CardHeader className="text-center border-b border-gray-200">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Confirmar Exclusão
          </CardTitle>
          <CardDescription>
            Tem certeza que deseja remover este produto? Esta ação não pode ser
            desfeita.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-6 py-2 rounded-lg border-gray-200 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg text-white disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
