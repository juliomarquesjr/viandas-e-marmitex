// Tipos para dados extraídos de notas fiscais

export interface InvoiceEmitent {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  endereco?: {
    logradouro?: string;
    numero?: string;
    bairro?: string;
    municipio?: string;
    uf?: string;
    cep?: string;
  };
}

export interface InvoiceItem {
  codigo?: string;
  descricao: string;
  quantidade: number;
  unidade?: string;
  valorUnitario: number;
  valorTotal: number;
}

export interface InvoiceTotals {
  valorProdutos: number;
  valorDesconto?: number;
  valorFrete?: number;
  valorICMS?: number;
  valorTotal: number;
}

export interface InvoiceData {
  chaveAcesso: string;
  numero: string;
  serie?: string;
  modelo: '55' | '65' | 'SAT'; // 55 = NFe, 65 = NFCe, SAT = Cupom SAT
  dataEmissao: string;
  dataEntradaSaida?: string;
  emitente: InvoiceEmitent;
  destinatario?: {
    cpf?: string;
    cnpj?: string;
    nome?: string;
  };
  itens: InvoiceItem[];
  totais: InvoiceTotals;
  uf: string;
  urlConsulta?: string;
}

export interface QRCodeData {
  url?: string;
  chaveAcesso?: string;
  rawData: string;
}

export interface SEFAZResponse {
  success: boolean;
  xml?: string;
  html?: string;
  error?: string;
}

