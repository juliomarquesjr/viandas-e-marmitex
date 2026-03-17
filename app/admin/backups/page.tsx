"use client";

import { PageHeader } from "@/app/admin/components/layout/PageHeader";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { CloudDownload, Database, FileText, HardDrive, Loader2, ShieldCheck } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useBackupActions } from "./hooks/useBackupActions";
import { BackupInfoCard } from "./components/BackupInfoCard";
import { RestoreCard } from "./components/RestoreCard";
import { SecurityTipsCard } from "./components/SecurityTipsCard";
import { RestoreDialog } from "./components/RestoreDialog";
import { ProgressModal } from "./components/ProgressModal";

export default function BackupsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);

  const {
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
  } = useBackupActions();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
      return;
    }
    if (session.user?.role !== "admin") {
      router.push("/unauthorized");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      </div>
    );
  }

  if (session?.user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      {/* Cabeçalho padrão do sistema */}
      <PageHeader
        title="Gerenciamento de Backups"
        description="Crie e restaure backups do banco de dados com segurança"
        icon={Database}
        actions={
          <Button onClick={handleCreateBackup} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <CloudDownload className="h-4 w-4 mr-2" />
                Criar Backup
              </>
            )}
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Cards de informação rápida */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 flex-shrink-0">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Formato</p>
                  <p className="text-sm font-semibold text-slate-900">PostgreSQL .sql</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 flex-shrink-0">
                  <HardDrive className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tamanho máximo</p>
                  <p className="text-sm font-semibold text-slate-900">100 MB por arquivo</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 flex-shrink-0">
                  <ShieldCheck className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Compatibilidade</p>
                  <p className="text-sm font-semibold text-slate-900">pg_restore / psql</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards principais */}
        <div className="grid gap-6 md:grid-cols-2">
          <BackupInfoCard
            autoDownload={autoDownload}
            onAutoDownloadChange={setAutoDownload}
          />
          <RestoreCard
            autoBackup={autoBackup}
            onAutoBackupChange={setAutoBackup}
            onOpenRestoreDialog={() => setIsRestoreDialogOpen(true)}
          />
        </div>

        {/* Recomendações de segurança */}
        <SecurityTipsCard />
      </div>

      {/* Dialogs */}
      <RestoreDialog
        open={isRestoreDialogOpen}
        onOpenChange={setIsRestoreDialogOpen}
        onRestore={handleRestoreBackup}
        isRestoring={isRestoring}
      />

      <ProgressModal
        open={showProgressModal}
        message={progressMessage}
        type={progressType}
      />
    </div>
  );
}
