"use client";

import {
  Camera,
  Check,
  Loader2,
  Mail,
  Phone,
  Shield,
  Trash2,
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
import { UserPhotoModal } from "@/app/admin/users/components/UserPhotoModal";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

interface UserFormData {
  name: string;
  email: string;
  phone: string;
  role: "admin" | "pdv";
  status: "active" | "inactive";
  password: string;
  imageUrl: string;
}

interface UserFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent, formData: UserFormData) => void | Promise<void>;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: "admin" | "pdv";
    status: "active" | "inactive";
    imageUrl?: string;
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
    imageUrl: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [removePhotoConfirmOpen, setRemovePhotoConfirmOpen] = useState(false);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [pendingPhotoPreviewUrl, setPendingPhotoPreviewUrl] = useState<string | null>(null);

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
          imageUrl: user.imageUrl || "",
        });
      } else {
        setFormData({
          name: "",
          email: "",
          phone: "",
          role: "pdv",
          status: "active",
          password: "",
          imageUrl: "",
        });
      }
      setErrors({});
      setTouched({});
      setIsSubmitting(false);
      setPendingPhotoFile(null);
      if (pendingPhotoPreviewUrl) {
        URL.revokeObjectURL(pendingPhotoPreviewUrl);
        setPendingPhotoPreviewUrl(null);
      }
    }
  }, [isOpen, user]);

  const updateFormData = (field: keyof UserFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const applyPhoneMask = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData("phone", applyPhoneMask(e.target.value));
  };

  const validateField = (field: keyof FormErrors, value: string | undefined): string | undefined => {
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
    setErrors((e) => ({ ...e, [field]: validateField(field, formData[field as keyof UserFormData] as string) }));
  };

  const validateForm = (): boolean => {
    const fields: Array<keyof FormErrors> = ["name", "email", "role", "password"];
    const newErrors: FormErrors = {};
    let valid = true;
    fields.forEach((field) => {
      const err = validateField(field, formData[field as keyof UserFormData] as string);
      if (err) { newErrors[field] = err; valid = false; }
    });
    setErrors(newErrors);
    setTouched({ name: true, email: true, phone: true, role: true, status: true, password: true, imageUrl: true });
    return valid;
  };

  const handlePhotoSelected = (file: File) => {
    setPendingPhotoFile(file);
    if (pendingPhotoPreviewUrl) URL.revokeObjectURL(pendingPhotoPreviewUrl);
    setPendingPhotoPreviewUrl(URL.createObjectURL(file));
    setPhotoModalOpen(false);
  };

  const handleRemovePhoto = () => {
    setPendingPhotoFile(null);
    if (pendingPhotoPreviewUrl) URL.revokeObjectURL(pendingPhotoPreviewUrl);
    setPendingPhotoPreviewUrl(null);
    updateFormData("imageUrl", "");
    setPhotoModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      let resolvedImageUrl = formData.imageUrl;
      if (pendingPhotoFile) {
        const fd = new FormData();
        fd.append("file", pendingPhotoFile);
        fd.append("prefix", "user");
        if (user?.imageUrl) fd.append("oldImageUrl", user.imageUrl);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("Falha ao enviar foto de perfil");
        const { url } = await res.json();
        resolvedImageUrl = url;
      }
      await onSubmit(e, { ...formData, imageUrl: resolvedImageUrl });
    } finally {
      setIsSubmitting(false);
    }
  };

  const err = (field: keyof FormErrors) =>
    touched[field] && errors[field] ? "border-red-400 focus:ring-red-400/20" : "";

  const currentAvatarUrl = pendingPhotoPreviewUrl ?? (formData.imageUrl || null);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
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
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* ── Foto de Perfil ── */}
              <SectionDivider label="Foto de Perfil" />
              <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
                {/* Avatar */}
                <div
                  className="h-20 w-20 rounded-full overflow-hidden border-4 border-white shadow-md bg-slate-100 flex items-center justify-center shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setPhotoModalOpen(true)}
                  title={currentAvatarUrl ? "Alterar foto" : "Adicionar foto"}
                >
                  {currentAvatarUrl ? (
                    <img src={currentAvatarUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="h-8 w-8 text-slate-300" />
                  )}
                </div>

                {/* Ações */}
                <div className="flex flex-col gap-1.5 min-w-0">
                  <p className="text-sm font-medium text-slate-700">
                    {currentAvatarUrl ? "Foto de perfil" : "Sem foto de perfil"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {currentAvatarUrl
                      ? "Clique na imagem ou use os botões para alterar ou remover"
                      : "Adicione uma foto via webcam ou arquivo"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPhotoModalOpen(true)}
                      className="text-xs h-8 gap-1.5"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {currentAvatarUrl ? "Alterar" : "Adicionar Foto"}
                    </Button>
                    {currentAvatarUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setRemovePhotoConfirmOpen(true)}
                        className="text-xs h-8 gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Informações Pessoais ── */}
              <SectionDivider label="Informações Pessoais" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome */}
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

                {/* Email */}
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

                {/* Telefone */}
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

      <UserPhotoModal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        currentPhotoUrl={currentAvatarUrl ?? undefined}
        onPhotoSelected={handlePhotoSelected}
        onRemovePhoto={handleRemovePhoto}
      />

      <DeleteConfirmDialog
        open={removePhotoConfirmOpen}
        onOpenChange={setRemovePhotoConfirmOpen}
        title="Remover foto de perfil"
        description="Tem certeza que deseja remover a foto de perfil? Esta ação será aplicada ao salvar o usuário."
        confirmText="Remover"
        onConfirm={() => {
          handleRemovePhoto();
          setRemovePhotoConfirmOpen(false);
        }}
      />
    </>
  );
}
