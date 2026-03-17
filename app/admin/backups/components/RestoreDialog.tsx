"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useToast } from "@/app/components/Toast";
import {
  AlertCircle,
  CheckCircle,
  FileCheck,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface RestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (file: File, onSuccess: () => void) => Promise<void>;
  isRestoring: boolean;
}

export function RestoreDialog({
  open,
  onOpenChange,
  onRestore,
  isRestoring,
}: RestoreDialogProps) {
  const { showToast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isConfirmed = confirmationText === "RESTAURAR";

  const resetState = () => {
    setSelectedFile(null);
    setConfirmationText("");
    setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (isRestoring) return;
    resetState();
    onOpenChange(false);
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith(".sql")) {
      showToast("Arquivo deve ser .sql", "error");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      showToast("Arquivo muito grande. Máximo: 100MB", "error");
      return;
    }
    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleSubmit = () => {
    if (!selectedFile || !isConfirmed) return;
    onRestore(selectedFile, resetState);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <Upload className="h-4 w-4 text-amber-600" />
            </div>
            Restaurar Backup
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            Selecione o arquivo de backup (.sql) para restaurar o banco de dados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Aviso de operação irreversível */}
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-900">Operação Irreversível</p>
              <p className="text-xs text-red-800 mt-0.5 leading-relaxed">
                Esta operação substituirá <strong>TODOS</strong> os dados atuais do banco de dados.
              </p>
            </div>
          </div>

          {/* Área de upload / drag and drop */}
          <div className="space-y-1.5">
            <Label htmlFor="backup-file" className="text-sm font-medium text-slate-700">
              Arquivo de Backup (.sql)
            </Label>
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-lg transition-all duration-200 ${
                isDragging
                  ? "border-blue-400 bg-blue-50"
                  : selectedFile
                  ? "border-emerald-400 bg-emerald-50 p-3"
                  : "border-slate-300 bg-slate-50 hover:border-slate-400 p-6"
              }`}
            >
              <input
                id="backup-file"
                type="file"
                accept=".sql"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-emerald-200">
                    <FileCheck className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                    className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 transition-transform ${isDragging ? "scale-110" : ""}`}>
                    <Upload className={`h-5 w-5 transition-colors ${isDragging ? "text-blue-500" : "text-slate-400"}`} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-700">
                      {isDragging ? "Solte o arquivo aqui" : "Arraste o arquivo aqui"}
                    </p>
                    <p className="text-xs text-slate-400">ou</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs h-7"
                    >
                      <FileText className="h-3 w-3 mr-1.5" />
                      Selecionar arquivo
                    </Button>
                  </div>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                    .sql • Máx. 100 MB
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Confirmação */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-restore" className="text-sm font-medium text-slate-700">
              Digite <span className="font-bold text-red-600">RESTAURAR</span> para confirmar:
            </Label>
            <Input
              id="confirm-restore"
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="RESTAURAR"
              className={`text-sm transition-all ${
                isConfirmed
                  ? "border-emerald-400 bg-emerald-50 focus:ring-emerald-400/20"
                  : ""
              }`}
            />
            {isConfirmed && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Confirmação válida</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isRestoring}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!selectedFile || !isConfirmed || isRestoring}
            className="flex-1"
          >
            {isRestoring ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              "Restaurar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
