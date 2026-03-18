"use client";

import { Button } from "@/app/components/ui/button";
import { Switch } from "@/app/components/ui/switch";
import { AlertTriangle, Upload } from "lucide-react";
import { SectionLabel, SettingsRow } from "./SectionLayout";

interface RestoreSectionProps {
  autoBackup: boolean;
  onAutoBackupChange: (value: boolean) => void;
  onOpenRestoreDialog: () => void;
}

export function RestoreSection({
  autoBackup,
  onAutoBackupChange,
  onOpenRestoreDialog,
}: RestoreSectionProps) {
  return (
    <div>
      <SectionLabel>Aviso Importante</SectionLabel>

      <div className="px-8 py-4 border-b border-slate-100">
        <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4">
          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-900">Operação Irreversível</p>
            <p className="text-xs text-red-800 mt-1 leading-relaxed">
              A restauração substituirá <strong>TODOS</strong> os dados atuais do banco de dados.
              Certifique-se de ter um backup recente antes de continuar.
            </p>
          </div>
        </div>
      </div>

      <SectionLabel>Opções</SectionLabel>

      <SettingsRow
        label="Backup automático"
        description="Criar um backup antes de restaurar"
      >
        <div className="flex flex-col gap-1.5">
          <Switch checked={autoBackup} onCheckedChange={onAutoBackupChange} />
          <p className="text-xs text-slate-500">
            {autoBackup
              ? "Ativado — um backup será criado antes de restaurar."
              : "Desativado — nenhum backup automático será criado."}
          </p>
        </div>
      </SettingsRow>

      <SectionLabel>Ação</SectionLabel>

      <SettingsRow
        label="Arquivo de backup"
        description="Selecione o arquivo .sql para restaurar o banco de dados"
      >
        <Button onClick={onOpenRestoreDialog} variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Selecionar arquivo e restaurar
        </Button>
      </SettingsRow>
    </div>
  );
}
