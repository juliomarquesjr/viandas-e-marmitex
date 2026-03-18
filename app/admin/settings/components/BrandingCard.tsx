"use client";

import { ImageCropModal } from "@/app/components/ImageCropModal";
import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { ConfigFormData } from "@/app/hooks/useSystemConfig";
import { Building2, Edit3, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { useState } from "react";

interface BrandingCardProps {
  formData: ConfigFormData;
  onFieldChange: (key: keyof ConfigFormData, value: string) => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-8 py-2.5 bg-slate-50/80 border-b border-slate-100">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{children}</span>
    </div>
  );
}

function SettingsRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-8 px-8 py-5 border-b border-slate-100 last:border-0">
      <div className="w-48 flex-shrink-0 pt-1">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function BrandingCard({ formData, onFieldChange }: BrandingCardProps) {
  const { showToast } = useToast();
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleLogoUpload = async (file: File) => {
    setIsUploadingLogo(true);
    try {
      if (!file.type.startsWith('image/')) throw new Error('Por favor, selecione um arquivo de imagem válido.');
      if (file.size > 5 * 1024 * 1024) throw new Error('O arquivo deve ter no máximo 5MB.');

      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      if (formData.branding_logo_url) uploadFormData.append("oldImageUrl", formData.branding_logo_url);

      const response = await fetch("/api/upload", { method: "POST", body: uploadFormData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha no upload");
      }

      const { url } = await response.json();
      onFieldChange('branding_logo_url', url);
      showToast("Logo enviada com sucesso!", "success", "Logo enviada com sucesso!", "Não esqueça de salvar as configurações.");
    } catch (error) {
      showToast("Erro no upload", "error", "Erro no upload", error instanceof Error ? error.message : "Falha no upload da logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const removeLogo = async () => {
    if (formData.branding_logo_url) {
      try {
        const response = await fetch('/api/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: formData.branding_logo_url }),
        });
        showToast(
          response.ok ? "Logo removida!" : "Aviso",
          response.ok ? "success" : "warning",
          response.ok ? "Logo removida!" : "Logo removida do formulário",
          response.ok ? "A logo foi removida." : "A logo foi removida do formulário, mas pode não ter sido removida do servidor."
        );
      } catch {
        showToast("Aviso", "warning", "Logo removida do formulário", "Não foi possível remover do servidor.");
      }
    }
    onFieldChange('branding_logo_url', '');
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const imageFile = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
    if (imageFile) setIsCropModalOpen(true);
    else showToast("Arquivo inválido", "error", "Arquivo inválido", "Selecione uma imagem.");
  };

  const handleCroppedImageUpload = async (croppedImageFile: File) => {
    setIsUploadingImage(true);
    try { await handleLogoUpload(croppedImageFile); }
    finally { setIsUploadingImage(false); }
  };

  return (
    <div>
      <SectionLabel>Títulos</SectionLabel>

      <SettingsRow label="Título do Sistema" description="Nome exibido no cabeçalho do sistema">
        <div className="relative max-w-sm">
          <Input
            value={formData.branding_system_title}
            onChange={(e) => onFieldChange('branding_system_title', e.target.value)}
            placeholder="Viandas e Marmitex"
            className="pl-9 h-9 text-sm rounded-lg border-slate-200"
          />
          <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        </div>
      </SettingsRow>

      <SettingsRow label="Título do PDV" description="Nome exibido no ponto de venda">
        <div className="relative max-w-sm">
          <Input
            value={formData.branding_pdv_title}
            onChange={(e) => onFieldChange('branding_pdv_title', e.target.value)}
            placeholder="PDV - Viandas e Marmitex"
            className="pl-9 h-9 text-sm rounded-lg border-slate-200"
          />
          <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        </div>
      </SettingsRow>

      <SectionLabel>Logo</SectionLabel>

      <SettingsRow label="Logo da Empresa" description="Formatos: JPEG, PNG, WebP. Máximo: 5MB. Será recortada em formato quadrado.">
        {formData.branding_logo_url ? (
          <div className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50 max-w-sm">
            <img
              src={formData.branding_logo_url}
              alt="Logo da empresa"
              className="h-16 w-16 rounded-lg object-contain border border-slate-200 bg-white flex-shrink-0"
            />
            <div className="flex-1 space-y-2">
              <p className="text-xs text-slate-500">Logo carregada</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCropModalOpen(true)}
                  className="h-7 px-2.5 text-xs flex items-center gap-1.5"
                >
                  <Edit3 className="h-3 w-3" />
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removeLogo}
                  className="h-7 px-2.5 text-xs flex items-center gap-1.5 border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                  Remover
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer max-w-sm ${
              isDragOver ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50 bg-slate-50/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => setIsCropModalOpen(true)}
          >
            <ImageIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600 mb-1">
              {isDragOver ? 'Solte a imagem aqui' : 'Clique ou arraste uma imagem'}
            </p>
            <p className="text-[10px] text-slate-400 mb-3">PNG, JPG ou WebP até 5MB</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setIsCropModalOpen(true); }}
              disabled={isUploadingImage || isUploadingLogo}
              className="h-7 px-3 text-xs flex items-center gap-1.5 mx-auto"
            >
              {isUploadingImage || isUploadingLogo ? (
                <><div className="h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />Enviando...</>
              ) : (
                <><Upload className="h-3 w-3" />Selecionar Logo</>
              )}
            </Button>
          </div>
        )}
      </SettingsRow>

      <ImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        onCropComplete={handleCroppedImageUpload}
        onUploadStart={() => setIsUploadingImage(true)}
        aspectRatio={1}
        maxWidth={800}
        maxHeight={800}
        title="Editar Logo da Empresa"
        description="Ajuste e faça o crop da logo para garantir que ela fique perfeita"
        selectImageTitle="Selecione uma logo"
        selectImageDescription="Escolha uma logo para editar e fazer o crop"
        cropButtonText="Aplicar e Salvar Logo"
        selectAnotherButtonText="Escolher Outra Logo"
      />
    </div>
  );
}
