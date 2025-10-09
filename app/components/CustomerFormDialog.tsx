"use client";

import { motion } from "framer-motion";
import {
    Barcode as BarcodeIcon,
    Check,
    FileText,
    Mail,
    MapPin,
    Phone,
    Plus,
    User,
    X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  doc: string;
  barcode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
  active: boolean;
}

interface CustomerFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent, formData: CustomerFormData) => void;
  editingCustomer: any;
  initialFormData: CustomerFormData;
}

export function CustomerFormDialog({
  open,
  onClose,
  onSubmit,
  editingCustomer,
  initialFormData,
}: CustomerFormDialogProps) {
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);

  useEffect(() => {
    if (open) {
      setFormData(initialFormData);
    }
  }, [open, initialFormData]);

  if (!open) return null;

  const updateFormData = (field: keyof CustomerFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Função para aplicar máscara de telefone brasileiro
  const applyPhoneMask = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara conforme o tamanho
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    } else {
      // Formato para celular com 9 dígitos
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maskedValue = applyPhoneMask(e.target.value);
    updateFormData("phone", maskedValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e, formData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl max-h-[95vh] overflow-hidden bg-white shadow-2xl rounded-2xl border border-gray-200 flex flex-col"
      >
        {/* Header with gradient and shadow */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 p-6 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {editingCustomer ? "Editar Cliente" : "Novo Cliente"}
              </h2>
              <p className="text-gray-600 mt-1 text-sm">
                {editingCustomer
                  ? "Atualize as informações do cliente"
                  : "Preencha os dados para cadastrar um novo cliente"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10 rounded-full hover:bg-white/50 text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable form content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information Section */}
              <div className="md:col-span-2">
                <h3 className="text-base font-semibold text-orange-800 flex items-center gap-2">
                  <User className="h-4 w-4 text-orange-600" />
                  Informações Pessoais
                </h3>
                <div className="mt-3 h-px bg-gradient-to-r from-orange-100 via-orange-300 to-orange-100"></div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    placeholder="Nome completo do cliente"
                    value={formData.name}
                    onChange={(e) =>
                      updateFormData("name", e.target.value)
                    }
                    className="pl-10 py-3 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all"
                    required
                  />
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  Telefone <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    maxLength={15}
                    className="pl-10 py-3 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all"
                    required
                  />
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="cliente@email.com"
                    value={formData.email}
                    onChange={(e) =>
                      updateFormData("email", e.target.value)
                    }
                    className="pl-10 py-3 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all"
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Documento (CPF/CNPJ)
                </label>
                <div className="relative">
                  <Input
                    placeholder="000.000.000-00"
                    value={formData.doc}
                    onChange={(e) =>
                      updateFormData("doc", e.target.value)
                    }
                    className="pl-10 py-3 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all"
                  />
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Barcode Section */}
              <div className="md:col-span-2">
                <h3 className="text-base font-semibold text-green-800 flex items-center gap-2 mt-4">
                  <BarcodeIcon className="h-4 w-4 text-green-600" />
                  Código de Barras
                </h3>
                <div className="mt-3 h-px bg-gradient-to-r from-green-100 via-green-300 to-green-100"></div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Código de Barras
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Input
                      placeholder="0123456789012"
                      value={formData.barcode}
                      onChange={(e) =>
                        updateFormData("barcode", e.target.value)
                      }
                      className="pl-10 py-3 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500/20 shadow-sm transition-all"
                    />
                    <BarcodeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // Gerar código de barras no range 1-3 (iniciando com 1, 2 ou 3)
                      const prefix = Math.floor(Math.random() * 3) + 1; // 1, 2 ou 3
                      const randomSuffix = Math.floor(
                        Math.random() * 1000000000000
                      );
                      const randomBarcode =
                        prefix * 1000000000000 + randomSuffix;
                      updateFormData("barcode", randomBarcode.toString());
                    }}
                    className="px-4 py-3 border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-all flex items-center gap-2"
                    title="Gerar código de barras aleatório"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Gerar</span>
                  </Button>
                </div>
              </div>

              {/* Address Section */}
              <div className="md:col-span-2">
                <h3 className="text-base font-semibold text-amber-800 flex items-center gap-2 mt-6">
                  <MapPin className="h-4 w-4 text-amber-600" />
                  Endereço
                </h3>
                <div className="mt-3 h-px bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100"></div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  CEP
                </label>
                <div className="relative">
                  <Input
                    placeholder="00000-000"
                    value={formData.zip}
                    onChange={(e) =>
                      updateFormData("zip", e.target.value)
                    }
                    className="pl-10 py-3 rounded-xl border-gray-200 focus:border-amber-500 focus:ring-amber-500/20 shadow-sm transition-all"
                  />
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Estado
                </label>
                <Input
                  placeholder="UF"
                  value={formData.state}
                  onChange={(e) =>
                    updateFormData("state", e.target.value)
                  }
                  className="py-3 rounded-xl border-gray-200 focus:border-amber-500 focus:ring-amber-500/20 shadow-sm transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Cidade
                </label>
                <Input
                  placeholder="Cidade"
                  value={formData.city}
                  onChange={(e) =>
                    updateFormData("city", e.target.value)
                  }
                  className="py-3 rounded-xl border-gray-200 focus:border-amber-500 focus:ring-amber-500/20 shadow-sm transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Bairro
                </label>
                <Input
                  placeholder="Bairro"
                  value={formData.neighborhood}
                  onChange={(e) =>
                    updateFormData("neighborhood", e.target.value)
                  }
                  className="py-3 rounded-xl border-gray-200 focus:border-amber-500 focus:ring-amber-500/20 shadow-sm transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Rua
                </label>
                <Input
                  placeholder="Nome da rua"
                  value={formData.street}
                  onChange={(e) =>
                    updateFormData("street", e.target.value)
                  }
                  className="py-3 rounded-xl border-gray-200 focus:border-amber-500 focus:ring-amber-500/20 shadow-sm transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Número
                </label>
                <Input
                  placeholder="Número"
                  value={formData.number}
                  onChange={(e) =>
                    updateFormData("number", e.target.value)
                  }
                  className="py-3 rounded-xl border-gray-200 focus:border-amber-500 focus:ring-amber-500/20 shadow-sm transition-all"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Complemento
                </label>
                <Input
                  placeholder="Complemento"
                  value={formData.complement}
                  onChange={(e) =>
                    updateFormData("complement", e.target.value)
                  }
                  className="py-3 rounded-xl border-gray-200 focus:border-amber-500 focus:ring-amber-500/20 shadow-sm transition-all"
                />
              </div>
            </div>

            {/* Status Toggle */}
            <div className="pt-4">
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Check className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Status do Cliente</h4>
                    <p className="text-sm text-gray-600">Ative ou desative o acesso do cliente</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => updateFormData("active", !formData.active)}
                  className={`relative h-6 w-11 rounded-full border-2 transition-colors ${
                    formData.active 
                      ? 'border-orange-500 bg-orange-500' 
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    formData.active ? 'translate-x-5' : 'translate-x-0.5'
                  }`}></span>
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Footer with actions */}
        <div className="border-t border-gray-200 p-6 bg-gray-50/50">
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-6 py-3 rounded-xl border-gray-300 hover:bg-gray-100 text-gray-700 font-medium transition-all"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-lg hover:shadow-xl transition-all"
            >
              {editingCustomer ? "Atualizar Cliente" : "Cadastrar Cliente"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}