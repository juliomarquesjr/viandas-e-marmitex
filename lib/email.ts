import nodemailer from 'nodemailer';
import { ClosingReportEmailData, EmailTemplates, ReportEmailData } from './email-templates';
import { SystemConfig } from './types';

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromName: string;
  fromAddress: string;
  replyTo?: string;
  enabled: boolean;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {}

  /**
   * Configura o serviço de email com as configurações do sistema
   */
  async configure(configs: SystemConfig[]): Promise<void> {
    const emailConfigs = configs.filter(config => config.category === 'email');
    
    if (emailConfigs.length === 0) {
      throw new Error('Configurações de email não encontradas');
    }

    const getConfigValue = (key: string, defaultValue: string = ''): string => {
      const config = emailConfigs.find(c => c.key === key);
      return config?.value || defaultValue;
    };

    this.config = {
      smtpHost: getConfigValue('email_smtp_host'),
      smtpPort: parseInt(getConfigValue('email_smtp_port', '587')),
      smtpSecure: getConfigValue('email_smtp_secure') === 'true',
      smtpUser: getConfigValue('email_smtp_user'),
      smtpPassword: getConfigValue('email_smtp_password'),
      fromName: getConfigValue('email_from_name', 'Viandas e Marmitex'),
      fromAddress: getConfigValue('email_from_address'),
      replyTo: getConfigValue('email_reply_to') || undefined,
      enabled: getConfigValue('email_enabled') === 'true'
    };

    // Validar configurações obrigatórias
    if (!this.config.enabled) {
      throw new Error('Serviço de email está desabilitado');
    }

    if (!this.config.smtpHost || !this.config.smtpUser || !this.config.smtpPassword) {
      throw new Error('Configurações de SMTP incompletas');
    }

    if (!this.config.fromAddress) {
      throw new Error('Email do remetente não configurado');
    }

    // Criar transporter com configurações mais robustas
    const transporterConfig: any = {
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: this.config.smtpSecure, // true para 465, false para outras portas
      auth: {
        user: this.config.smtpUser,
        pass: this.config.smtpPassword,
      },
      // Configurações de timeout
      connectionTimeout: 60000, // 60 segundos
      greetingTimeout: 30000,   // 30 segundos
      socketTimeout: 60000,     // 60 segundos
    };

    // Configurações TLS baseadas no tipo de conexão
    if (this.config.smtpSecure) {
      // SSL/TLS (porta 465)
      transporterConfig.tls = {
        rejectUnauthorized: false, // Para desenvolvimento
        ciphers: 'HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA'
      };
    } else {
      // STARTTLS (porta 587)
      transporterConfig.requireTLS = true;
      transporterConfig.tls = {
        rejectUnauthorized: false, // Para desenvolvimento
        ciphers: 'HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA'
      };
    }

    this.transporter = nodemailer.createTransport(transporterConfig);
  }

  /**
   * Testa a conexão SMTP
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.transporter) {
      return { success: false, error: 'Serviço de email não configurado' };
    }

    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error) {
      console.error('Erro ao testar conexão SMTP:', error);
      
      // Tentar configuração alternativa se falhar
      if (this.config) {
        console.log('Tentando configuração alternativa...');
        const altResult = await this.tryAlternativeConfig();
        if (altResult) {
          return { success: true };
        }
      }
      
      return { 
        success: false, 
        error: this.analyzeError(error) 
      };
    }
  }

  /**
   * Tenta configuração alternativa de SMTP
   */
  private async tryAlternativeConfig(): Promise<boolean> {
    if (!this.config) return false;

    // Aguardar um pouco antes de tentar novamente para evitar bloqueio
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // Tentar com SSL desabilitado
      const altConfig = {
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: false, // Forçar STARTTLS
        auth: {
          user: this.config.smtpUser,
          pass: this.config.smtpPassword,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
      };

      const altTransporter = nodemailer.createTransport(altConfig);
      await altTransporter.verify();
      
      // Se funcionou, atualizar o transporter principal
      this.transporter = altTransporter;
      console.log('Configuração alternativa funcionou!');
      return true;
    } catch (error) {
      console.error('Configuração alternativa também falhou:', error);
      return false;
    }
  }

  /**
   * Analisa o erro e retorna uma mensagem mais clara
   */
  private analyzeError(error: any): string {
    if (error.code === 'EAUTH') {
      if (error.response?.includes('Too many bad auth attempts')) {
        return 'Muitas tentativas de login falharam. Aguarde alguns minutos e tente novamente.';
      }
      if (error.response?.includes('Invalid login')) {
        return 'Usuário ou senha incorretos. Verifique as credenciais.';
      }
      if (error.response?.includes('Username and Password not accepted')) {
        return 'Credenciais não aceitas. Use senha de aplicativo para Gmail/Outlook.';
      }
      return 'Erro de autenticação. Verifique usuário e senha.';
    }
    
    if (error.code === 'ESOCKET') {
      if (error.message?.includes('wrong version number')) {
        return 'Configuração SSL/TLS incorreta. Tente trocar entre SSL e STARTTLS.';
      }
      return 'Erro de conexão. Verifique host e porta.';
    }
    
    if (error.code === 'ECONNREFUSED') {
      return 'Conexão recusada. Verifique se o host e porta estão corretos.';
    }
    
    return error.message || 'Erro desconhecido de conexão SMTP.';
  }

  /**
   * Envia um email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter || !this.config) {
      throw new Error('Serviço de email não configurado');
    }

    if (!this.config.enabled) {
      throw new Error('Serviço de email está desabilitado');
    }

    const mailOptions = {
      from: `"${this.config.fromName}" <${this.config.fromAddress}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo || this.config.replyTo,
      attachments: options.attachments
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email enviado com sucesso:', result.messageId);
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      throw new Error(`Falha ao enviar email: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Envia email de teste
   */
  async sendTestEmail(to: string): Promise<void> {
    const testSubject = 'Teste de Configuração de Email - Viandas e Marmitex';
    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">✅ Teste de Email</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Viandas e Marmitex</p>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #374151; margin-top: 0;">Configuração de Email Funcionando!</h2>
          <p style="color: #6b7280; line-height: 1.6;">
            Parabéns! Suas configurações de email estão funcionando corretamente.
            O sistema está pronto para enviar relatórios por email.
          </p>
          <div style="background: #e5f3ff; border: 1px solid #3b82f6; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #1e40af; font-weight: 500;">
              📧 Este é um email de teste enviado em ${new Date().toLocaleString('pt-BR')}
            </p>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
            Se você recebeu este email, significa que a configuração SMTP está correta.
          </p>
        </div>
      </div>
    `;

    const testText = `
Teste de Configuração de Email - Viandas e Marmitex

Configuração de Email Funcionando!

Parabéns! Suas configurações de email estão funcionando corretamente.
O sistema está pronto para enviar relatórios por email.

Este é um email de teste enviado em ${new Date().toLocaleString('pt-BR')}

Se você recebeu este email, significa que a configuração SMTP está correta.
    `;

    await this.sendEmail({
      to,
      subject: testSubject,
      html: testHtml,
      text: testText
    });
  }

  /**
   * Verifica se o serviço está configurado e habilitado
   */
  isConfigured(): boolean {
    return this.transporter !== null && this.config !== null && this.config.enabled;
  }

  /**
   * Envia relatório usando templates
   */
  async sendReport(reportData: ReportEmailData, to: string | string[]): Promise<void> {
    if (!this.transporter || !this.config) {
      throw new Error('Serviço de email não configurado');
    }

    if (!this.config.enabled) {
      throw new Error('Serviço de email está desabilitado');
    }

    const html = EmailTemplates.generateReportHtml(reportData);
    const text = EmailTemplates.generateReportText(reportData);

    await this.sendEmail({
      to,
      subject: reportData.subject,
      html,
      text
    });
  }

  /**
   * Envia relatório de cliente específico
   */
  async sendCustomerReport(customerName: string, reportData: ReportEmailData, to: string | string[]): Promise<void> {
    const modifiedData = {
      ...reportData,
      subject: `Relatório de Cliente - ${customerName}`,
      reportType: `Relatório de Cliente - ${customerName}`
    };

    await this.sendReport(modifiedData, to);
  }

  /**
   * Envia relatório de vendas
   */
  async sendSalesReport(reportData: ReportEmailData, to: string | string[]): Promise<void> {
    const modifiedData = {
      ...reportData,
      subject: reportData.subject || 'Relatório de Vendas',
      reportType: 'Relatório de Vendas'
    };

    await this.sendReport(modifiedData, to);
  }

  /**
   * Envia relatório de fechamento
   */
  async sendClosingReport(reportData: ReportEmailData, to: string | string[]): Promise<void> {
    const modifiedData = {
      ...reportData,
      subject: reportData.subject || 'Relatório de Fechamento',
      reportType: 'Relatório de Fechamento'
    };

    await this.sendReport(modifiedData, to);
  }

  /**
   * Envia relatório de fechamento de cliente específico
   */
  async sendCustomerClosingReport(data: ClosingReportEmailData): Promise<void> {
    if (!this.transporter || !this.config) {
      throw new Error('Serviço de email não configurado');
    }

    const subject = `Relatório de Fechamento - ${data.customerName}`;
    const html = EmailTemplates.generateCustomerClosingReportHtml(data);
    const text = EmailTemplates.generateCustomerClosingReportText(data);

    await this.sendEmail({
      to: data.customerEmail,
      subject,
      html,
      text,
      replyTo: this.config.replyTo
    });
  }

  /**
   * Envia relatório de fechamento de cliente com PDF anexado
   */
  async sendCustomerClosingReportWithPDF(
    data: ClosingReportEmailData, 
    pdfBuffer: Buffer
  ): Promise<void> {
    if (!this.transporter || !this.config) {
      throw new Error('Serviço de email não configurado');
    }

    const subject = `Relatório de Fechamento - ${data.customerName}`;
    const html = EmailTemplates.generateCustomerClosingReportHtml(data);
    const text = EmailTemplates.generateCustomerClosingReportText(data);

    // Nome do arquivo PDF
    const filename = `relatorio-fechamento-${data.customerName.replace(/\s+/g, '-').toLowerCase()}-${data.period.startDate}-${data.period.endDate}.pdf`;

    await this.sendEmail({
      to: data.customerEmail,
      subject,
      html,
      text,
      replyTo: this.config.replyTo,
      attachments: [{
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
        encoding: 'base64'
      }]
    });
  }

  /**
   * Obtém as configurações atuais
   */
  getConfig(): EmailConfig | null {
    return this.config;
  }
}

// Instância singleton do serviço de email
export const emailService = new EmailService();
