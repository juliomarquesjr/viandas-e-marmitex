"use client";

import { PageHeader } from "@/app/admin/components/layout/PageHeader";
import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import { ConfigFormData, useSystemConfig } from "@/app/hooks/useSystemConfig";
import { AlertCircle, Building2, Loader2, Mail, Phone, QrCode, RefreshCw, Save, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandingCard } from "./components/BrandingCard";
import { ContactCard } from "./components/ContactCard";
import { EmailCard } from "./components/EmailCard";
import { PaymentCard } from "./components/PaymentCard";
import { SettingsPageSkeleton } from "./components/SettingsPageSkeleton";

const navItems = [
  {
    id: 'contact' as const,
    label: 'Contato',
    shortDescription: 'Telefones e endereço',
    fullDescription: 'Configure os dados de contato e localização da empresa',
    icon: Phone,
  },
  {
    id: 'branding' as const,
    label: 'Marca',
    shortDescription: 'Títulos e logo',
    fullDescription: 'Configure a identidade visual e os títulos do sistema',
    icon: Building2,
  },
  {
    id: 'email' as const,
    label: 'Email',
    shortDescription: 'Servidor SMTP',
    fullDescription: 'Configure o servidor de envio de emails e relatórios',
    icon: Mail,
  },
  {
    id: 'payment' as const,
    label: 'Pagamento',
    shortDescription: 'Chave PIX',
    fullDescription: 'Configure os dados de pagamento PIX para recibos',
    icon: QrCode,
  },
];

type SectionId = typeof navItems[number]['id'];

export default function SettingsPage() {
  const { configs, loading, saving, error, saveConfigs, getFormData } = useSystemConfig();
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState<SectionId>('contact');

  const [formData, setFormData] = useState<ConfigFormData>({
    contact_address_street: '',
    contact_address_number: '',
    contact_address_neighborhood: '',
    contact_address_city: '',
    contact_address_state: '',
    contact_address_zipcode: '',
    contact_address_complement: '',
    contact_phone_mobile: '',
    contact_phone_landline: '',
    branding_system_title: 'Viandas e Marmitex',
    branding_pdv_title: 'PDV - Viandas e Marmitex',
    branding_logo_url: '',
    email_smtp_host: '',
    email_smtp_port: '587',
    email_smtp_secure: 'false',
    email_smtp_user: '',
    email_smtp_password: '',
    email_from_name: 'Viandas e Marmitex',
    email_from_address: '',
    email_reply_to: '',
    email_enabled: 'false',
    payment_pix_key: '',
    restaurant_latitude: '',
    restaurant_longitude: '',
  });

  useEffect(() => {
    if (configs.length > 0) setFormData(getFormData());
  }, [configs, getFormData]);

  const handleInputChange = (key: keyof ConfigFormData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const success = await saveConfigs(formData);
    if (success) {
      showToast("Configurações salvas!", "success", "Configurações salvas!", "Todas as configurações foram atualizadas com sucesso.");
    } else {
      showToast("Erro ao salvar", "error", "Erro ao salvar", error || "Não foi possível salvar as configurações");
    }
  };

  const activeNavItem = navItems.find(n => n.id === activeSection)!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações do Sistema"
        description="Gerencie as configurações gerais, contato e marca do sistema"
        icon={Settings}
        actions={
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Salvar Configurações</>
            )}
          </Button>
        }
      />

      {loading && configs.length === 0 ? (
        <SettingsPageSkeleton />
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          {/* Settings Panel */}
          <div
            className="flex overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]"
            style={{ minHeight: 580 }}
          >
            {/* Sidebar navigation */}
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
                    <h2 className="text-sm font-semibold text-[color:var(--foreground)]">
                      {activeNavItem.label}
                    </h2>
                    <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">
                      {activeNavItem.fullDescription}
                    </p>
                  </div>
                </div>
              </div>

              {/* Active section content */}
              <div
                className="flex-1 overflow-y-auto"
                style={{ scrollbarGutter: "stable" }}
              >
                {activeSection === "contact" && (
                  <ContactCard
                    formData={formData}
                    onFieldChange={handleInputChange}
                  />
                )}
                {activeSection === "branding" && (
                  <BrandingCard
                    formData={formData}
                    onFieldChange={handleInputChange}
                  />
                )}
                {activeSection === "email" && (
                  <EmailCard
                    formData={formData}
                    onFieldChange={handleInputChange}
                  />
                )}
                {activeSection === "payment" && (
                  <PaymentCard
                    formData={formData}
                    onFieldChange={handleInputChange}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
