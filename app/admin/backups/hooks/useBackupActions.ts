"use client";

import { useToast } from "@/app/components/Toast";
import { isDesktopRuntime, saveBlobWithNativeDialog } from "@/lib/runtime/capabilities";
import { useState } from "react";

export interface BackupActionsReturn {
  isCreating: boolean;
  isRestoring: boolean;
  autoDownload: boolean;
  autoBackup: boolean;
  showProgressModal: boolean;
  progressMessage: string;
  progressType: "backup" | "restore";
  setAutoDownload: (value: boolean) => void;
  setAutoBackup: (value: boolean) => void;
  handleCreateBackup: () => Promise<void>;
  handleRestoreBackup: (
    selectedFile: File,
    onSuccess: () => void
  ) => Promise<void>;
}

export function useBackupActions(): BackupActionsReturn {
  const { showToast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [autoDownload, setAutoDownload] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [progressType, setProgressType] = useState<"backup" | "restore">("backup");

  const handleCreateBackup = async () => {
    try {
      setIsCreating(true);
      setProgressType("backup");
      setProgressMessage("Iniciando criação do backup...");
      setShowProgressModal(true);

      const response = await fetch("/api/backups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        try {
          const error = await response.json();
          throw new Error(error.error || "Erro ao criar backup");
        } catch {
          throw new Error("Erro ao criar backup");
        }
      }

      setProgressMessage("Backup criado! Preparando download...");

      if (autoDownload) {
        const contentDisposition = response.headers.get("Content-Disposition");
        let filename = "backup-viandas.sql";
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="(.+)"/);
          if (match) filename = match[1];
        }

        const blob = await response.blob();

        if (isDesktopRuntime()) {
          const savePath = await saveBlobWithNativeDialog(blob, filename);
          if (!savePath) {
            throw new Error("Salvamento cancelado pelo usuário");
          }
        } else {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }

        setProgressMessage("Download concluído!");
        setTimeout(() => setShowProgressModal(false), 500);
        showToast("Backup criado com sucesso!", "success", "Download iniciado", "O arquivo de backup foi baixado com sucesso.");
      } else {
        setProgressMessage("Backup concluído!");
        setTimeout(() => setShowProgressModal(false), 500);
        showToast("Backup criado com sucesso!", "success", "Backup concluído", "O backup foi criado. Ative o download automático para baixar o arquivo.");
      }
    } catch (error: any) {
      console.error("Erro ao criar backup:", error);
      setShowProgressModal(false);
      showToast("Erro ao criar backup", "error", "Erro", error.message || "Não foi possível criar o backup");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestoreBackup = async (selectedFile: File, onSuccess: () => void) => {
    try {
      setIsRestoring(true);
      setProgressType("restore");
      setProgressMessage("Iniciando restauração do backup...");
      setShowProgressModal(true);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("confirmed", "true");
      formData.append("autoBackup", autoBackup ? "true" : "false");

      setProgressMessage(
        autoBackup
          ? "Criando backup automático antes da restauração..."
          : "Preparando restauração..."
      );

      const response = await fetch("/api/backups/restore", {
        method: "POST",
        body: formData,
      });

      setProgressMessage("Restaurando dados do banco de dados...");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao restaurar backup");
      }

      setProgressMessage("Restauração concluída! Finalizando...");

      if (data.autoBackup?.data && data.autoBackup?.filename) {
        setProgressMessage("Baixando backup automático...");
        try {
          const dlResponse = await fetch(data.autoBackup.data);
          const blob = await dlResponse.blob();

          if (isDesktopRuntime()) {
            const savePath = await saveBlobWithNativeDialog(blob, data.autoBackup.filename);
            if (!savePath) {
              throw new Error("Salvamento cancelado pelo usuário");
            }
          } else {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = data.autoBackup.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }

          setProgressMessage("Restauração concluída com sucesso!");
          setTimeout(() => setShowProgressModal(false), 1000);
          showToast("Backup restaurado com sucesso!", "success", "Backup automático baixado", "Um backup automático foi criado antes da restauração e foi baixado automaticamente.");
        } catch {
          setProgressMessage("Restauração concluída!");
          setTimeout(() => setShowProgressModal(false), 500);
          showToast("Backup restaurado com sucesso!", "success", "Aviso", "Backup restaurado, mas houve um problema ao baixar o backup automático.");
        }
      } else {
        setProgressMessage("Restauração concluída com sucesso!");
        setTimeout(() => setShowProgressModal(false), 1000);
        showToast("Backup restaurado com sucesso!", "success");
      }

      onSuccess();
    } catch (error: any) {
      console.error("Erro ao restaurar backup:", error);
      setShowProgressModal(false);
      showToast("Erro ao restaurar backup", "error", "Erro", error.message || "Não foi possível restaurar o backup");
    } finally {
      setIsRestoring(false);
    }
  };

  return {
    isCreating,
    isRestoring,
    autoDownload,
    autoBackup,
    showProgressModal,
    progressMessage,
    progressType,
    setAutoDownload,
    setAutoBackup,
    handleCreateBackup,
    handleRestoreBackup,
  };
}
