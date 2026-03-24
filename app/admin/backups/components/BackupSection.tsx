"use client";

import { Switch } from "@/app/components/ui/switch";
import { Database, FileText, HardDrive } from "lucide-react";
import { SectionLabel, SettingsRow } from "./SectionLayout";

interface BackupSectionProps {
  autoDownload: boolean;
  onAutoDownloadChange: (value: boolean) => void;
}

export function BackupSection({ autoDownload, onAutoDownloadChange }: BackupSectionProps) {
  return (
    <div>
      <SectionLabel>Conteúdo</SectionLabel>

      <SettingsRow
        label="O que é incluído"
        description="Dados exportados no arquivo de backup"
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Todas as tabelas, dados, índices e estrutura completa do banco de dados PostgreSQL.
        </p>
      </SettingsRow>

      <SectionLabel>Especificações</SectionLabel>

      <SettingsRow label="Formato" description="Tipo de arquivo gerado">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
          <FileText className="h-3.5 w-3.5 text-blue-500" />
          PostgreSQL .sql
        </span>
      </SettingsRow>

      <SettingsRow label="Tamanho máximo" description="Limite por arquivo de backup">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
          <HardDrive className="h-3.5 w-3.5 text-emerald-500" />
          100 MB
        </span>
      </SettingsRow>

      <SettingsRow label="Compatibilidade" description="Ferramentas para restauração">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
          <Database className="h-3.5 w-3.5 text-purple-500" />
          pg_restore / psql
        </span>
      </SettingsRow>

      <SectionLabel>Opções</SectionLabel>

      <SettingsRow
        label="Download automático"
        description="Baixar o arquivo automaticamente após a criação"
      >
        <div className="flex flex-col gap-1.5">
          <Switch checked={autoDownload} onCheckedChange={onAutoDownloadChange} />
          <p className="text-xs text-slate-500">
            {autoDownload
              ? "Ativado — o arquivo será baixado após a criação."
              : "Desativado — backup criado sem download automático."}
          </p>
        </div>
      </SettingsRow>
    </div>
  );
}
