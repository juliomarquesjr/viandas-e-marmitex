"use client";

import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { ConfigFormData } from "@/app/hooks/useSystemConfig";
import { Mail, Send, Shield } from "lucide-react";
import { useState } from "react";

interface EmailCardProps {
  formData: ConfigFormData;
  onFieldChange: (key: keyof ConfigFormData, value: string) => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-8 py-2.5 bg-slate-50/80 border-b border-slate-100">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{children}</span>
    </div>
  );
}

function SettingsRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-8 px-8 py-5 border-b border-slate-100 last:border-0">
      <div className="w-48 flex-shrink-0 pt-1">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function EmailCard({ formData, onFieldChange }: EmailCardProps) {
  const { showToast } = useToast();
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const handleTestEmail = async () => {
    if (!testEmail.trim()) { showToast("Digite um email para teste", "error"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) { showToast("Formato de email inválido", "error"); return; }
    try {
      setIsTestingEmail(true);
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail }),
      });
      const data = await response.json();
      if (response.ok) { showToast(data.message, "success"); setTestEmail(''); }
      else showToast(data.error || "Erro ao testar configurações", "error");
    } catch {
      showToast("Erro ao testar configurações de email", "error");
    } finally {
      setIsTestingEmail(false);
    }
  };

  return (
    <div>
      <SectionLabel>Geral</SectionLabel>

      <SettingsRow label="Envio de Emails" description="Ativa ou desativa o envio de emails pelo sistema">
        <div className="flex items-center gap-3 pt-0.5">
          <Switch
            id="email_enabled"
            checked={formData.email_enabled === 'true'}
            onCheckedChange={(checked) => onFieldChange('email_enabled', checked ? 'true' : 'false')}
          />
          <span className={`text-xs font-medium ${formData.email_enabled === 'true' ? 'text-emerald-600' : 'text-slate-400'}`}>
            {formData.email_enabled === 'true' ? 'Ativado' : 'Desativado'}
          </span>
        </div>
      </SettingsRow>

      <SettingsRow label="Nome do Remetente" description="Nome exibido no campo &quot;De:&quot; dos emails">
        <div className="relative max-w-xs">
          <Input
            value={formData.email_from_name}
            onChange={(e) => onFieldChange('email_from_name', e.target.value)}
            placeholder="Viandas e Marmitex"
            className="pl-9 h-9 text-sm rounded-lg border-slate-200"
          />
          <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        </div>
      </SettingsRow>

      <SectionLabel>Servidor SMTP</SectionLabel>

      <SettingsRow label="Servidor" description="Endereço do servidor SMTP">
        <div className="relative max-w-xs">
          <Input
            value={formData.email_smtp_host}
            onChange={(e) => onFieldChange('email_smtp_host', e.target.value)}
            placeholder="smtp.gmail.com"
            className="pl-9 h-9 text-sm rounded-lg border-slate-200"
          />
          <Send className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        </div>
      </SettingsRow>

      <SettingsRow label="Porta" description="Porta de conexão (587 para STARTTLS, 465 para SSL)">
        <Input
          value={formData.email_smtp_port}
          onChange={(e) => onFieldChange('email_smtp_port', e.target.value)}
          placeholder="587"
          type="number"
          className="h-9 text-sm rounded-lg border-slate-200 max-w-[100px]"
        />
      </SettingsRow>

      <SettingsRow label="Conexão Segura" description="Ativa SSL/TLS. Deixe desativado para usar STARTTLS (recomendado)">
        <div className="flex items-center gap-3 pt-0.5">
          <Switch
            id="email_smtp_secure"
            checked={formData.email_smtp_secure === 'true'}
            onCheckedChange={(checked) => onFieldChange('email_smtp_secure', checked ? 'true' : 'false')}
          />
          <span className="text-xs text-slate-500">
            {formData.email_smtp_secure === 'true' ? 'SSL/TLS (porta 465)' : 'STARTTLS (porta 587)'}
          </span>
        </div>
      </SettingsRow>

      <SettingsRow label="Usuário" description="Email de autenticação no servidor SMTP">
        <Input
          value={formData.email_smtp_user}
          onChange={(e) => onFieldChange('email_smtp_user', e.target.value)}
          placeholder="seu-email@gmail.com"
          type="email"
          className="h-9 text-sm rounded-lg border-slate-200 max-w-xs"
        />
      </SettingsRow>

      <SettingsRow label="Senha" description="Senha ou senha de aplicativo do SMTP">
        <Input
          value={formData.email_smtp_password}
          onChange={(e) => onFieldChange('email_smtp_password', e.target.value)}
          placeholder="••••••••••••"
          type="password"
          className="h-9 text-sm rounded-lg border-slate-200 max-w-xs"
        />
      </SettingsRow>

      <SectionLabel>Remetente</SectionLabel>

      <SettingsRow label="Email de Envio" description="Endereço que aparece como remetente nos emails">
        <Input
          value={formData.email_from_address}
          onChange={(e) => onFieldChange('email_from_address', e.target.value)}
          placeholder="noreply@viandase.com"
          type="email"
          className="h-9 text-sm rounded-lg border-slate-200 max-w-xs"
        />
      </SettingsRow>

      <SettingsRow label="Email de Resposta" description="Endereço que recebe respostas (reply-to)">
        <Input
          value={formData.email_reply_to}
          onChange={(e) => onFieldChange('email_reply_to', e.target.value)}
          placeholder="contato@viandase.com"
          type="email"
          className="h-9 text-sm rounded-lg border-slate-200 max-w-xs"
        />
      </SettingsRow>

      <SectionLabel>Teste</SectionLabel>

      <SettingsRow label="Enviar Email de Teste" description="Valide as configurações SMTP enviando um email de teste">
        <div className="flex gap-2 max-w-sm">
          <div className="relative flex-1">
            <Input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="seu-email@exemplo.com"
              type="email"
              className="pl-9 h-9 text-sm rounded-lg border-slate-200"
            />
            <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestEmail}
            disabled={!formData.email_enabled || !formData.email_smtp_host || !formData.email_smtp_user || !testEmail.trim() || isTestingEmail}
            className="h-9 px-3 text-xs flex items-center gap-1.5 whitespace-nowrap"
          >
            {isTestingEmail ? (
              <><div className="h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />Testando...</>
            ) : (
              <><Send className="h-3 w-3" />Testar</>
            )}
          </Button>
        </div>
      </SettingsRow>
    </div>
  );
}
