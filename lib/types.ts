// Tipos compartilhados entre cliente e servidor
export interface SystemConfig {
  id: string;
  key: string;
  value: string | null;
  type: 'text' | 'json' | 'image';
  category: 'general' | 'contact' | 'branding' | 'email';
  createdAt: Date;
  updatedAt: Date;
}

export interface ConfigFormData {
  contact_address_street: string;
  contact_address_number: string;
  contact_address_neighborhood: string;
  contact_address_city: string;
  contact_address_state: string;
  contact_address_zipcode: string;
  contact_address_complement: string;
  contact_phone_mobile: string;
  contact_phone_landline: string;
  branding_system_title: string;
  branding_pdv_title: string;
  branding_logo_url: string;
  email_smtp_host: string;
  email_smtp_port: string;
  email_smtp_secure: string;
  email_smtp_user: string;
  email_smtp_password: string;
  email_from_name: string;
  email_from_address: string;
  email_reply_to: string;
  email_enabled: string;
}
