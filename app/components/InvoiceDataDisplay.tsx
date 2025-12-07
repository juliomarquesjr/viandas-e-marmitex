"use client";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { X, Copy, Check, FileText, Calendar, Building2, Package, DollarSign } from "lucide-react";
import { useState } from "react";
import { InvoiceData } from "@/lib/nf-scanner/types";
import { formatCentsToValue } from "@/lib/nf-scanner/utils";

interface InvoiceDataDisplayProps {
  invoiceData: InvoiceData;
  onUseForExpense: () => void;
  onClose: () => void;
}

export function InvoiceDataDisplay({
  invoiceData,
  onUseForExpense,
  onClose,
}: InvoiceDataDisplayProps) {
  const [copied, setCopied] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("pt-BR");
    } catch {
      return dateStr;
    }
  };

  const copyToClipboard = async () => {
    const text = `
NOTA FISCAL ${invoiceData.modelo === "65" ? "NFC-e" : "NFe"}
Chave de Acesso: ${invoiceData.chaveAcesso}
Número: ${invoiceData.numero}
Data: ${formatDate(invoiceData.dataEmissao)}
Emitente: ${invoiceData.emitente.razaoSocial} (CNPJ: ${invoiceData.emitente.cnpj})
Total: ${formatCurrency(invoiceData.totais.valorTotal)}
Itens: ${invoiceData.itens.length}
${invoiceData.itens.map((item, idx) => `${idx + 1}. ${item.descricao} - ${formatCurrency(item.valorTotal)}`).join("\n")}
    `.trim();

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Erro ao copiar:", err);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <Card className="w-full max-w-3xl max-h-[90vh] bg-white shadow-xl border border-gray-200 flex flex-col">
        <CardHeader className="border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                Dados da Nota Fiscal
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                {invoiceData.modelo === "65" ? "NFC-e" : invoiceData.modelo === "55" ? "NFe" : "Cupom"} - {invoiceData.uf}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Informações Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="h-4 w-4" />
                <span className="font-medium">Chave de Acesso:</span>
              </div>
              <p className="text-sm font-mono bg-gray-50 p-2 rounded border break-all">
                {invoiceData.chaveAcesso}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Data de Emissão:</span>
              </div>
              <p className="text-sm font-medium">{formatDate(invoiceData.dataEmissao)}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">Número:</span>
              </div>
              <p className="text-sm font-medium">{invoiceData.numero}</p>
            </div>
            {invoiceData.serie && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Série:</span>
                </div>
                <p className="text-sm font-medium">{invoiceData.serie}</p>
              </div>
            )}
          </div>

          {/* Emitente */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Emitente</h3>
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-gray-900">{invoiceData.emitente.razaoSocial}</p>
              {invoiceData.emitente.nomeFantasia && (
                <p className="text-gray-600">{invoiceData.emitente.nomeFantasia}</p>
              )}
              <p className="text-gray-600">CNPJ: {invoiceData.emitente.cnpj}</p>
              {invoiceData.emitente.endereco && (
                <p className="text-gray-600">
                  {invoiceData.emitente.endereco.logradouro}
                  {invoiceData.emitente.endereco.numero && `, ${invoiceData.emitente.endereco.numero}`}
                  {invoiceData.emitente.endereco.bairro && ` - ${invoiceData.emitente.endereco.bairro}`}
                  {invoiceData.emitente.endereco.municipio && `, ${invoiceData.emitente.endereco.municipio}/${invoiceData.emitente.endereco.uf}`}
                </p>
              )}
            </div>
          </div>

          {/* Totais */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Totais</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Produtos:</span>
                <span className="font-medium">{formatCurrency(invoiceData.totais.valorProdutos)}</span>
              </div>
              {invoiceData.totais.valorDesconto && invoiceData.totais.valorDesconto > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Desconto:</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(invoiceData.totais.valorDesconto)}
                  </span>
                </div>
              )}
              {invoiceData.totais.valorFrete && invoiceData.totais.valorFrete > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Frete:</span>
                  <span className="font-medium">{formatCurrency(invoiceData.totais.valorFrete)}</span>
                </div>
              )}
              <div className="border-t border-green-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(invoiceData.totais.valorTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Itens */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Itens ({invoiceData.itens.length})</h3>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {invoiceData.itens.map((item, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-sm text-gray-900 flex-1">
                      {item.descricao}
                    </p>
                    <p className="font-semibold text-sm text-gray-900 ml-2">
                      {formatCurrency(item.valorTotal)}
                    </p>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-600">
                    <span>
                      Qtd: {item.quantidade} {item.unidade || "un"}
                    </span>
                    <span>
                      Unit: {formatCurrency(item.valorUnitario)}
                    </span>
                    {item.codigo && <span>Cód: {item.codigo}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50/50">
          <div className="flex justify-between items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </>
              )}
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={onClose}
              >
                Fechar
              </Button>
              <Button
                size="sm"
                onClick={onUseForExpense}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Usar para Despesa
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

