"use client";

import { useToast } from '@/app/components/Toast';
import { Button } from '@/app/components/ui/button';
import { Loader2, Mail, Send } from 'lucide-react';
import { useState } from 'react';

interface EmailReportButtonProps {
  reportType: string;
  reportData: any;
  subject: string;
  period?: {
    startDate: string;
    endDate: string;
  };
  summary?: {
    totalValue?: number;
    totalOrders?: number;
    totalCustomers?: number;
  };
  customerName?: string;
  className?: string;
}

export function EmailReportButton({
  reportType,
  reportData,
  subject,
  period,
  summary,
  customerName,
  className = ""
}: EmailReportButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const { showToast } = useToast();

  const handleSendEmail = async () => {
    if (!emailAddress.trim()) {
      showToast("Digite um email válido", "error");
      return;
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      showToast("Formato de email inválido", "error");
      return;
    }

    try {
      setIsSending(true);

      const response = await fetch('/api/email/send-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: emailAddress,
          subject: customerName ? `${subject} - ${customerName}` : subject,
          reportType: customerName ? `Relatório de Cliente - ${customerName}` : reportType,
          reportData,
          period,
          summary,
          companyInfo: {
            name: 'Viandas e Marmitex',
            // Adicionar outras informações da empresa se necessário
          }
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message, "success");
        setEmailAddress('');
        setShowEmailForm(false);
      } else {
        showToast(data.error || "Erro ao enviar relatório", "error");
      }
    } catch (error) {
      console.error('Erro ao enviar relatório por email:', error);
      showToast("Erro ao enviar relatório por email", "error");
    } finally {
      setIsSending(false);
    }
  };

  if (showEmailForm) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium">Enviar por Email</span>
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            placeholder="Digite o email do destinatário"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSending}
          />
          <Button
            onClick={handleSendEmail}
            disabled={isSending || !emailAddress.trim()}
            size="sm"
            className="flex items-center gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar
              </>
            )}
          </Button>
          <Button
            onClick={() => setShowEmailForm(false)}
            variant="outline"
            size="sm"
            disabled={isSending}
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={() => setShowEmailForm(true)}
      variant="outline"
      className={`flex items-center gap-2 ${className}`}
    >
      <Mail className="h-4 w-4" />
      Enviar por Email
    </Button>
  );
}
