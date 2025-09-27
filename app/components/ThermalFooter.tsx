"use client";

interface ThermalFooterProps {
  className?: string;
  contactInfo?: {
    address: string;
    phones: {
      mobile: string;
      landline: string;
    };
  };
}

export function ThermalFooter({ className = "", contactInfo }: ThermalFooterProps) {
  const address = contactInfo?.address || '';
  const phones = contactInfo?.phones || { mobile: '', landline: '' };

  return (
    <div className={`thermal-footer ${className}`}>
      {/* Informações de Contato */}
      <div className="thermal-contact-section">
        <div className="thermal-contact-title">
          INFORMAÇÕES DE CONTATO:
        </div>
        
        {/* Telefones um abaixo do outro */}
        {phones.mobile && (
          <div className="thermal-contact-info">
            <img 
              src="/img/whatsapp_thermal.png" 
              alt="WhatsApp" 
              className="thermal-icon"
            />
            {phones.mobile}
          </div>
        )}
        
        {phones.landline && (
          <div className="thermal-contact-info">
            <img 
              src="/img/telefone_fixo_thermal.png" 
              alt="Telefone" 
              className="thermal-icon"
            />
            {phones.landline}
          </div>
        )}
        
        {address && (
          <div className="thermal-contact-info">
            <img 
              src="/img/pin_de_localizacao_thermal.png" 
              alt="Localização" 
              className="thermal-icon"
            />
            {address}
          </div>
        )}
        
        {/* Se não tem dados, mostra mensagem */}
        {!address && !phones.mobile && !phones.landline && (
          <div className="thermal-contact-info">
            Configure as informações em /admin/settings
          </div>
        )}
      </div>
    </div>
  );
}
