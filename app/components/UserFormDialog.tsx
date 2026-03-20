"use client";

import { motion } from "framer-motion";
import {
  User as UserIcon,
  Lock,
  Mail,
  Phone,
  Shield,
  X,
  UserPlus,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface UserFormData {
  name: string;
  email: string;
  phone: string;
  role: "admin" | "pdv";
  status: "active" | "inactive";
  password: string;
}

interface UserFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent, formData: UserFormData) => void;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: "admin" | "pdv";
    status: "active" | "inactive";
    facialImageUrl?: string;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export function UserFormDialog({
  isOpen,
  onClose,
  onSubmit,
  user,
}: UserFormDialogProps) {
  const [formData, setFormData] = useState<UserFormData>({
    name: "",
    email: "",
    phone: "",
    role: "pdv",
    status: "active",
    password: "",
  });

  useEffect(() => {
    if (isOpen) {
      if (user) {
        setFormData({
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          role: user.role,
          status: user.status,
          password: "",
        });
      } else {
        setFormData({
          name: "",
          email: "",
          phone: "",
          role: "pdv",
          status: "active",
          password: "",
        });
      }
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const updateFormData = (field: keyof UserFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Função para aplicar máscara de telefone brasileiro
  const applyPhoneMask = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    } else {
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
        className="w-full max-w-2xl max-h-[95vh] overflow-hidden bg-white shadow-2xl rounded-2xl border border-gray-200 flex flex-col"
      >
        {/* Header with gradient and shadow */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 p-6 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-orange-600" />
                {user ? "Editar Usuário" : "Novo Usuário"}
              </h2>
              <p className="text-gray-600 mt-1 text-sm">
                {user
                  ? "Atualize as informações do usuário"
                  : "Preencha os dados para cadastrar um novo usuário"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-12 w-12 rounded-full bg-white/60 hover:bg-white shadow-md border border-gray-200 text-gray-600 hover:text-gray-800 transition-all hover:scale-105"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Scrollable form content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="user-form-modal" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information Section */}
              <div className="md:col-span-2">
                <h3 className="text-base font-semibold text-orange-800 flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-orange-600" />
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
                    placeholder="Nome completo do usuário"
                    value={formData.name}
                    onChange={(e) => updateFormData("name", e.target.value)}
                    className="rounded-lg border-input focus:border-ring focus:ring-ring/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  E-mail <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={formData.email}
                    onChange={(e) => updateFormData("email", e.target.value)}
                    className="pl-10 rounded-lg border-input focus:border-ring focus:ring-ring/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  Telefone
                </label>
                <Input
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className="rounded-lg border-input focus:border-ring focus:ring-ring/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Perfil <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => updateFormData("role", e.target.value as UserFormData["role"])}
                  className="w-full px-3 py-2 rounded-lg border border-input focus:border-ring focus:ring-ring/20 focus:outline-none"
                  required
                >
                  <option value="pdv">PDV</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => updateFormData("status", e.target.value as UserFormData["status"])}
                  className="w-full px-3 py-2 rounded-lg border border-input focus:border-ring focus:ring-ring/20 focus:outline-none"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Lock className="h-4 w-4" />
                  {user ? "Nova Senha" : "Senha"} {user ? "" : <span className="text-red-500">*</span>}
                </label>
                <Input
                  type="password"
                  placeholder={user ? "Deixe em branco para manter a senha atual" : "Digite uma senha"}
                  value={formData.password}
                  onChange={(e) => updateFormData("password", e.target.value)}
                  className="rounded-lg border-input focus:border-ring focus:ring-ring/20"
                  {...(!user && { required: true })}
                />
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
              form="user-form-modal"
              className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-lg hover:shadow-xl transition-all"
            >
              {user ? "Atualizar Usuário" : "Cadastrar Usuário"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
