"use client";

import { PageHeader } from "@/app/admin/components/layout/PageHeader";
import { Button } from "@/app/components/ui/button";
import { CloudDownload, Database, Loader2, Upload } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useBackupActions } from "./hooks/useBackupActions";
import { BackupSection } from "./components/BackupSection";
import { RestoreSection } from "./components/RestoreSection";
import { RestoreDialog } from "./components/RestoreDialog";
import { ProgressModal } from "./components/ProgressModal";
import { BackupsPageSkeleton } from "./components/BackupsPageSkeleton";

const navItems = [
  {
    id: "backup" as const,
    label: "Criar Backup",
    shortDescription: "Download e exportação",
    fullDescription: "Configure e inicie a criação do backup do banco de dados",
    icon: CloudDownload,
  },
  {
    id: "restore" as const,
    label: "Restaurar",
    shortDescription: "Importar arquivo .sql",
    fullDescription: "Restaure o banco de dados a partir de um arquivo de backup",
    icon: Upload,
  },
];

type SectionId = (typeof navItems)[number]["id"];

export default function BackupsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SectionId>("backup");
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
      <div className="space-y-6">
        <BackupsPageSkeleton />
      </div>
    );
  }

  if (session?.user?.role !== "admin") return null;

  const activeNavItem = navItems.find((n) => n.id === activeSection)!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gerenciamento de Backups"
        description="Crie e restaure backups do banco de dados"
        icon={Database}
        actions={
          <Button size="sm" onClick={handleCreateBackup} disabled={isCreating}>
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

      {/* Main Panel */}
      <div
        className="flex overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]"
        style={{ minHeight: 580 }}
      >
        {/* Sidebar */}
        <nav className="w-52 flex-shrink-0 space-y-0.5 border-r border-[color:var(--border)] bg-[color:var(--muted)]/60 p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                  isActive
                    ? "border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm"
                    : "hover:bg-[color:var(--accent)]/70"
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                    isActive ? "bg-primary/10" : "bg-[color:var(--card)]"
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 transition-colors ${
                      isActive ? "text-primary" : "text-[color:var(--muted-foreground)]"
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold leading-tight ${
                      isActive ? "text-[color:var(--foreground)]" : "text-[color:var(--muted-foreground)]"
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="mt-0.5 truncate text-xs leading-tight text-[color:var(--muted-foreground)]">
                    {item.shortDescription}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Section header — sticky */}
          <div className="sticky top-0 z-10 flex-shrink-0 border-b border-[color:var(--border)] bg-[color:var(--card)] px-8 py-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary/10 flex-shrink-0">
                <activeNavItem.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[color:var(--foreground)]">{activeNavItem.label}</h2>
                <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">{activeNavItem.fullDescription}</p>
              </div>
            </div>
          </div>

          {/* Section content */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
            {activeSection === "backup" && (
              <BackupSection
                autoDownload={autoDownload}
                onAutoDownloadChange={setAutoDownload}
              />
            )}
            {activeSection === "restore" && (
              <RestoreSection
                autoBackup={autoBackup}
                onAutoBackupChange={setAutoBackup}
                onOpenRestoreDialog={() => setIsRestoreDialogOpen(true)}
              />
            )}
          </div>
        </div>
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
