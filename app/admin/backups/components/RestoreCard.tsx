"use client";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Switch } from "@/app/components/ui/switch";
import { AlertTriangle, Info, Upload } from "lucide-react";

interface RestoreCardProps {
  autoBackup: boolean;
  onAutoBackupChange: (value: boolean) => void;
  onOpenRestoreDialog: () => void;
}

export function RestoreCard({
  autoBackup,
  onAutoBackupChange,
  onOpenRestoreDialog,
}: RestoreCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
            <Upload className="h-4 w-4 text-emerald-600" />
          </div>
          Restaurar Backup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-500">
          Faça upload de um arquivo de backup (.sql) para restaurar o banco de dados para um estado anterior.
        </p>

        {/* Switch de backup automático antes de restaurar */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
          <div className="flex items-start gap-2 flex-1">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">Backup automático</p>
              <p className="text-xs text-blue-700 mt-0.5">
                {autoBackup
                  ? "Um backup será criado antes de restaurar."
                  : "Nenhum backup automático será criado."}
              </p>
            </div>
          </div>
          <Switch
            checked={autoBackup}
            onCheckedChange={onAutoBackupChange}
            className="flex-shrink-0 ml-3"
          />
        </div>

        <Button
          onClick={onOpenRestoreDialog}
          className="w-full"
          variant="outline"
        >
          <Upload className="h-4 w-4 mr-2" />
          Selecionar arquivo e restaurar
        </Button>

        {/* Aviso */}
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800">
            <strong>Atenção:</strong> A restauração substituirá todos os dados atuais do banco de dados.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
