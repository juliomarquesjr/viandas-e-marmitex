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

// Tipos para o sistema de despesas
export interface ExpenseType {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierType {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  typeId: string;
  supplierTypeId: string;
  amountCents: number;
  description: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  type?: ExpenseType;
  supplierType?: SupplierType;
}

export interface ExpenseWithRelations extends Expense {
  type: ExpenseType;
  supplierType: SupplierType;
}

export interface ExpenseFormData {
  typeId: string;
  supplierTypeId: string;
  amountCents: number;
  description: string;
  date: string;
}

export interface ExpenseTypeFormData {
  name: string;
  description?: string;
  active?: boolean;
}

export interface SupplierTypeFormData {
  name: string;
  description?: string;
  active?: boolean;
}

export interface ExpensesPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ExpensesResponse {
  expenses: ExpenseWithRelations[];
  pagination: ExpensesPagination;
}

// Tipos para relatórios de lucros
export interface ProfitReportData {
  period: {
    startDate: string;
    endDate: string;
  };
  revenue: {
    sales: number; // Vendas confirmadas em centavos
    fichaPayments: number; // Pagamentos ficha em centavos
    total: number; // Total receita em centavos
  };
  expenses: {
    total: number; // Total despesas em centavos
    details: Array<{
      typeId: string;
      typeName: string;
      amountCents: number;
      count: number;
    }>;
  };
  profit: {
    total: number; // Lucro total em centavos
    percentage: number; // Percentual de lucro
  };
  dailyBreakdown: Array<{
    date: string;
    sales_revenue: number;
    ficha_revenue: number;
  }>;
}