"use client";

import {
  Barcode as BarcodeIcon,
  Camera,
  Check,
  FileText,
  Lock,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  User,
  X,
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
import { CustomerPhotoModal } from "@/app/admin/customers/components/CustomerPhotoModal";

interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  doc: string;
  barcode: string;
  password: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
  active: boolean;
  imageUrl: string;
}

interface CustomerFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent, formData: CustomerFormData) => void;
  editingCustomer: any;
  initialFormData: CustomerFormData;
}

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

export function CustomerFormDialog({
  open,
  onClose,
  onSubmit,
  editingCustomer,
  initialFormData,
}: CustomerFormDialogProps) {
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(initialFormData);
      setIsSubmitting(false);
      setUploadingPhoto(false);
    }
  }, [open, initialFormData]);

  const updateFormData = (field: keyof CustomerFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const applyPhoneMask = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData("phone", applyPhoneMask(e.target.value));
  };

  const generateBarcode = () => {
    const prefix = Math.floor(Math.random() * 3) + 1;
    const suffix = Math.floor(Math.random() * 1000000000000);
    updateFormData("barcode", (prefix * 1000000000000 + suffix).toString());
  };

  const handlePhotoSelected = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("prefix", "customer");
      if (formData.imageUrl) {
        uploadFormData.append("oldImageUrl", formData.imageUrl);
      }
      const res = await fetch("/api/upload", { method: "POST", body: uploadFormData });
      if (res.ok) {
        const { url } = await res.json();
        updateFormData("imageUrl", url);
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoModalOpen = () => {
    setPhotoModalOpen(true);
  };

  const handlePhotoModalClose = () => {
    setPhotoModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(e, formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open && !photoModalOpen} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                style={{
                  background: "var(--modal-header-icon-bg)",
                  outline: "1px solid var(--modal-header-icon-ring)",
                }}
              >
                <User className="h-5 w-5 text-primary" />
              </div>
              {editingCustomer ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? "Atualize as informações do cliente abaixo"
                : "Preencha os dados para cadastrar um novo cliente"}
            </DialogDescription>
          </DialogHeader>

          <form
            id="customer-form-modal"
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* ── Foto do Cliente ── */}
              <SectionDivider label="Foto do Cliente" />

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                {/* Avatar preview */}
                <div className="relative h-16 w-16 shrink-0">
                  <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white shadow-md bg-slate-100 flex items-center justify-center">
                    {uploadingPhoto ? (
                      <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                    ) : formData.imageUrl ? (
                      <img
                        src={formData.imageUrl}
                        alt="Foto do cliente"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-7 w-7 text-slate-400" />
                    )}
                  </div>
                  {formData.imageUrl && !uploadingPhoto && (
                    <button
                      type="button"
                      onClick={() => updateFormData("imageUrl", "")}
                      className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:bg-red-600 transition-colors"
                      title="Remover foto"
                    >
                      <X className="h-2.5 w-2.5 text-white" />
                    </button>
                  )}
                </div>

                {/* Info + button */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">
                    {formData.imageUrl ? "Foto cadastrada" : "Sem foto"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formData.imageUrl
                      ? "Clique no × para remover ou em Alterar para trocar"
                      : "Adicione uma foto por webcam ou arquivo"}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePhotoModalOpen}
                  disabled={uploadingPhoto}
                  className="shrink-0"
                >
                  <Camera className="h-4 w-4 mr-1.5" />
                  {formData.imageUrl ? "Alterar" : "Adicionar"}
                </Button>
              </div>

              {/* ── Informações Pessoais ── */}
              <SectionDivider label="Informações Pessoais" />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Nome — 2/3 da largura */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Nome Completo <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Nome completo do cliente"
                      value={formData.name}
                      onChange={(e) => updateFormData("name", e.target.value)}
                      className="pl-9"
                      required
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Telefone — 1/3 da largura */}
                <div className="space-y-1.5 sm:col-span-1">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Telefone <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="(00) 00000-0000"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      maxLength={15}
                      className="pl-9"
                      required
                    />
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Email — 2/3 da largura */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Email
                  </Label>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="cliente@email.com"
                      value={formData.email}
                      onChange={(e) => updateFormData("email", e.target.value)}
                      className="pl-9"
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Documento — 1/3 da largura */}
                <div className="space-y-1.5 sm:col-span-1">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    CPF / CNPJ
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="000.000.000-00"
                      value={formData.doc}
                      onChange={(e) => updateFormData("doc", e.target.value)}
                      className="pl-9"
                    />
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* ── Acesso & Identificação ── */}
              <SectionDivider label="Acesso & Identificação" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Senha */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Senha{" "}
                    {editingCustomer && (
                      <span className="text-slate-300 font-normal normal-case tracking-normal">
                        — deixe em branco para não alterar
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      type="password"
                      placeholder={
                        editingCustomer
                          ? "Nova senha (opcional)"
                          : "Senha para o app"
                      }
                      value={formData.password}
                      onChange={(e) => updateFormData("password", e.target.value)}
                      className="pl-9"
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                  {!editingCustomer && (
                    <p className="text-xs text-slate-400">
                      Permite acesso ao aplicativo mobile
                    </p>
                  )}
                </div>

                {/* Código de Barras */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Código de Barras
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="0123456789012"
                        value={formData.barcode}
                        onChange={(e) => updateFormData("barcode", e.target.value)}
                        className="pl-9"
                      />
                      <BarcodeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateBarcode}
                      className="px-3 flex-shrink-0"
                      title="Gerar código de barras aleatório"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1.5">Gerar</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* ── Endereço ── */}
              <SectionDivider label="Endereço" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* CEP */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    CEP
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="00000-000"
                      value={formData.zip}
                      onChange={(e) => updateFormData("zip", e.target.value)}
                      className="pl-9"
                    />
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Estado */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Estado
                  </Label>
                  <Input
                    placeholder="UF"
                    value={formData.state}
                    onChange={(e) => updateFormData("state", e.target.value)}
                  />
                </div>

                {/* Cidade */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Cidade
                  </Label>
                  <Input
                    placeholder="Cidade"
                    value={formData.city}
                    onChange={(e) => updateFormData("city", e.target.value)}
                  />
                </div>

                {/* Bairro */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Bairro
                  </Label>
                  <Input
                    placeholder="Bairro"
                    value={formData.neighborhood}
                    onChange={(e) => updateFormData("neighborhood", e.target.value)}
                  />
                </div>

                {/* Rua — full width */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Rua
                  </Label>
                  <Input
                    placeholder="Nome da rua"
                    value={formData.street}
                    onChange={(e) => updateFormData("street", e.target.value)}
                  />
                </div>

                {/* Número */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Número
                  </Label>
                  <Input
                    placeholder="Número"
                    value={formData.number}
                    onChange={(e) => updateFormData("number", e.target.value)}
                  />
                </div>

                {/* Complemento */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Complemento
                  </Label>
                  <Input
                    placeholder="Apto, bloco, etc."
                    value={formData.complement}
                    onChange={(e) => updateFormData("complement", e.target.value)}
                  />
                </div>
              </div>

              {/* ── Status ── */}
              <SectionDivider label="Status" />

              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center"
                    style={{
                      background: "var(--modal-header-icon-bg)",
                      outline: "1px solid var(--modal-header-icon-ring)",
                    }}
                  >
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Status do Cliente</p>
                    <p className="text-xs text-slate-400">Ative ou desative o acesso do cliente</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateFormData("active", !formData.active)}
                  className={`relative h-6 w-11 rounded-full transition-colors flex-shrink-0 ${
                    formData.active ? "bg-primary" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      formData.active ? "translate-x-5" : "translate-x-0"
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
                <Button
                  type="submit"
                  form="customer-form-modal"
                  disabled={isSubmitting || uploadingPhoto}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingCustomer ? "Atualizando..." : "Cadastrando..."}
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 mr-2" />
                      {editingCustomer ? "Atualizar Cliente" : "Cadastrar Cliente"}
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CustomerPhotoModal
        isOpen={photoModalOpen}
        onClose={handlePhotoModalClose}
        currentPhotoUrl={formData.imageUrl || undefined}
        onPhotoSelected={handlePhotoSelected}
        onRemovePhoto={() => updateFormData("imageUrl", "")}
      />
    </>
  );
}
