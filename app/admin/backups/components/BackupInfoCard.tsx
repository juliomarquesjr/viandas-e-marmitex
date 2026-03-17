"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Switch } from "@/app/components/ui/switch";
import { Database, Download, FileText, Info } from "lucide-react";

interface BackupInfoCardProps {
  autoDownload: boolean;
  onAutoDownloadChange: (value: boolean) => void;
}

export function BackupInfoCard({ autoDownload, onAutoDownloadChange }: BackupInfoCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
          </div>
          Informações sobre o Backup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 flex-shrink-0">
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">O que é incluído</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Todas as tabelas, dados, índices e estrutura completa do banco de dados.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 flex-shrink-0">
            <Database className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">Formato do arquivo</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Arquivo SQL padrão do PostgreSQL, compatível com pg_restore e psql.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 flex-shrink-0">
              <Download className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Download automático</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {autoDownload
                  ? "O arquivo será baixado após a criação."
                  : "O backup será criado sem download automático."}
              </p>
            </div>
          </div>
          <Switch
            checked={autoDownload}
            onCheckedChange={onAutoDownloadChange}
            className="flex-shrink-0 ml-3"
          />
        </div>
      </CardContent>
    </Card>
  );
}
