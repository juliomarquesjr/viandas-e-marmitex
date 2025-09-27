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
          CONTATO:
        </div>
        
        {/* Telefones um abaixo do outro */}
        {phones.mobile && (
          <div className="thermal-contact-info">
            📲 {phones.mobile}
          </div>
        )}
        
        {phones.landline && (
          <div className="thermal-contact-info">
            📞 {phones.landline}
          </div>
        )}
        
        {address && (
          <div className="thermal-contact-info">
            📍 {address}
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
