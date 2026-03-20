"use client";

import {
  Check,
  Loader2,
  Mail,
  Phone,
  Shield,
  User as UserIcon,
  UserPlus,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

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

type FormErrors = Partial<Record<keyof UserFormData, string>>;
type FormTouched = Partial<Record<keyof UserFormData, boolean>>;

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});

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
      setErrors({});
      setTouched({});
      setIsSubmitting(false);
    }
  }, [isOpen, user]);

  const updateFormData = (field: keyof UserFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

  const validateField = (field: keyof FormErrors, value: any): string | undefined => {
    switch (field) {
      case "name": return !value?.trim() ? "Obrigatório" : undefined;
      case "email": return !value?.trim() ? "Obrigatório" : undefined;
      case "role": return !value ? "Obrigatório" : undefined;
      case "password": return !user && !value?.trim() ? "Obrigatório" : undefined;
      default: return undefined;
    }
  };

  const handleBlur = (field: keyof FormErrors) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((e) => ({ ...e, [field]: validateField(field, formData[field]) }));
  };

  const validateForm = (): boolean => {
    const fields: Array<keyof FormErrors> = ["name", "email", "role", "password"];
    const newErrors: FormErrors = {};
    let valid = true;
    fields.forEach((field) => {
      const err = validateField(field, formData[field]);
      if (err) { newErrors[field] = err; valid = false; }
    });
    setErrors(newErrors);
    setTouched({ name: true, email: true, phone: true, role: true, status: true, password: true });
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(e, formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const err = (field: keyof FormErrors) =>
    touched[field] && errors[field] ? "border-red-400 focus:ring-red-400/20" : "";

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
            >
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            {user ? "Editar Usuário" : "Novo Usuário"}
          </DialogTitle>
          <DialogDescription>
            {user
              ? "Atualize as informações do usuário abaixo"
              : "Preencha os dados para cadastrar um novo usuário"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            {/* ── Informações Pessoais ── */}
            <SectionDivider label="Informações Pessoais" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome — 2/3 da largura */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Nome Completo <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Nome completo do usuário"
                    value={formData.name}
                    onChange={(e) => updateFormData("name", e.target.value)}
                    onBlur={() => handleBlur("name")}
                    className={`pl-9 ${err("name")}`}
                    required
                  />
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
                {touched.name && errors.name && (
                  <p className="text-xs text-red-500">{errors.name}</p>
                )}
              </div>

              {/* Email — 2/3 da largura */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Email <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={formData.email}
                    onChange={(e) => updateFormData("email", e.target.value)}
                    onBlur={() => handleBlur("email")}
                    className={`pl-9 ${err("email")}`}
                    required
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
                {touched.email && errors.email && (
                  <p className="text-xs text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Telefone — 1/3 da largura */}
              <div className="space-y-1.5 sm:col-span-1">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Telefone
                </Label>
                <div className="relative">
                  <Input
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className="pl-9"
                  />
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* ── Perfil & Acesso ── */}
            <SectionDivider label="Perfil & Acesso" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Perfil */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Perfil <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Select
                    value={formData.role}
                    onValueChange={(v) => {
                      updateFormData("role", v as UserFormData["role"]);
                      if (touched.role) setErrors((e) => ({ ...e, role: undefined }));
                    }}
                  >
                    <SelectTrigger className={`pl-9 ${err("role")}`}>
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999] bg-white border border-slate-200 shadow-lg" position="popper" side="bottom" align="start">
                      <SelectItem value="pdv">PDV</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
                {touched.role && errors.role && (
                  <p className="text-xs text-red-500">{errors.role}</p>
                )}
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Senha{" "}
                  {user && (
                    <span className="text-slate-300 font-normal normal-case tracking-normal">
                      — deixe em branco para não alterar
                    </span>
                  )}
                  {!user && <span className="text-red-400">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    type="password"
                    placeholder={user ? "Nova senha (opcional)" : "Senha para acesso"}
                    value={formData.password}
                    onChange={(e) => updateFormData("password", e.target.value)}
                    onBlur={() => handleBlur("password")}
                    className={`pl-9 ${err("password")}`}
                    {...(!user && { required: true })}
                  />
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
                {touched.password && errors.password && (
                  <p className="text-xs text-red-500">{errors.password}</p>
                )}
              </div>
            </div>

            {/* ── Status ── */}
            <SectionDivider label="Status" />

            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
                >
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Status do Usuário</p>
                  <p className="text-xs text-slate-400">Ative ou desative o acesso do usuário</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateFormData("status", formData.status === "active" ? "inactive" : "active")}
                className={`relative h-6 w-11 rounded-full transition-colors flex-shrink-0 ${
                  formData.status === "active" ? "bg-primary" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    formData.status === "active" ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          <DialogFooter>
            <p className="text-xs text-slate-400">
              <span className="text-red-400">*</span> campos obrigatórios
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {user ? "Atualizando..." : "Cadastrando..."}
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {user ? "Atualizar" : "Cadastrar Usuário"}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
