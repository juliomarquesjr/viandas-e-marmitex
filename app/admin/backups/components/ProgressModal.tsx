"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { CloudDownload, Loader2, Upload } from "lucide-react";

interface ProgressModalProps {
  open: boolean;
  message: string;
  type: "backup" | "restore";
}

export function ProgressModal({ open, message, type }: ProgressModalProps) {
  const isBackup = type === "backup";

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div
            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
              isBackup ? "bg-blue-50" : "bg-amber-50"
            }`}
          >
            {isBackup ? (
              <CloudDownload className="h-6 w-6 text-blue-600" />
            ) : (
              <Upload className="h-6 w-6 text-amber-600" />
            )}
          </div>
          <DialogTitle className="text-center">
            {isBackup ? "Criando Backup" : "Restaurando Backup"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {message || "Processando..."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Barra de progresso animada */}
          <div className="space-y-3">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`absolute h-full w-1/3 rounded-full ${
                  isBackup
                    ? "bg-gradient-to-r from-blue-500 to-blue-600"
                    : "bg-gradient-to-r from-amber-500 to-amber-600"
                } animate-[shimmer_1.5s_ease-in-out_infinite]`}
              />
            </div>
            <div className="flex items-center justify-center gap-2">
              <div
                className={`h-2 w-2 rounded-full animate-pulse ${
                  isBackup ? "bg-blue-500" : "bg-amber-500"
                }`}
              />
              <span className="text-xs font-medium text-slate-500">
                Processando...
              </span>
            </div>
          </div>

          {/* Mensagem informativa */}
          <div className="flex items-start justify-center gap-3 rounded-lg bg-slate-50 p-4 border border-slate-200">
            <Loader2
              className={`h-5 w-5 animate-spin mt-0.5 flex-shrink-0 ${
                isBackup ? "text-blue-600" : "text-amber-600"
              }`}
            />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-900">
                Aguarde, isso pode levar alguns instantes
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Não feche esta janela durante o processo
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
