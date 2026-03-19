"use client";

import {
    Barcode,
    Check,
    Edit3,
    FileText,
    Image,
    Loader2,
    Package,
    Tag,
    Trash2,
    Upload,
    Wallet,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Category, Product } from "../page";
import { ImageCropModal } from "@/app/components/ImageCropModal";
import { Button } from "@/app/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";

interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void> | void;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isUploading: boolean;
  categories: Category[];
  editingProduct: Product | null;
  handleFileUpload: (file: File) => void;
  formatPriceToReais: (cents: number) => string;
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

export function ProductFormDialog({
  open,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isUploading,
  categories,
  editingProduct,
  handleFileUpload,
  formatPriceToReais,
}: ProductFormDialogProps) {
  const [displayPrice, setDisplayPrice] = useState("");
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priceType, setPriceType] = useState<"unit" | "perKg">("unit");
  const hasInitializedPriceType = useRef(false);
  const previousOpenState = useRef(false);

  // Determinar tipo de preço apenas quando o modal abre pela primeira vez
  useEffect(() => {
    if (!open) {
      if (previousOpenState.current) {
        setPriceType("unit");
        setDisplayPrice("");
        hasInitializedPriceType.current = false;
        setIsSubmitting(false);
      }
      previousOpenState.current = false;
      return;
    }

    if (!previousOpenState.current && !hasInitializedPriceType.current) {
      previousOpenState.current = true;

      if (formData.pricePerKgCents && parseInt(formData.pricePerKgCents) > 0) {
        setPriceType("perKg");
        const cents = parseInt(formData.pricePerKgCents) || 0;
        setDisplayPrice(formatPriceToReais(cents));
        hasInitializedPriceType.current = true;
      } else if (formData.priceCents && parseInt(formData.priceCents) > 0) {
        setPriceType("unit");
        const cents = parseInt(formData.priceCents) || 0;
        setDisplayPrice(formatPriceToReais(cents));
        hasInitializedPriceType.current = true;
      } else {
        setPriceType("unit");
        setDisplayPrice("");
        hasInitializedPriceType.current = true;
      }
    }
  }, [open]);

  const updateFormData = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const formatCurrencyInput = (value: string): string => {
    let cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length > 10) cleanValue = cleanValue.substring(0, 10);
    const numericValue = parseInt(cleanValue) || 0;
    const formatted = (numericValue / 100).toFixed(2);
    return `R$ ${formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ".").replace(".", ",")}`;
  };

  const convertToCents = (formattedValue: string): number => {
    const cleanValue = formattedValue
      .replace("R$ ", "")
      .replace(/\./g, "")
      .replace(",", ".");
    return Math.round(parseFloat(cleanValue) * 100);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = rawValue ? formatCurrencyInput(rawValue) : "";
    setDisplayPrice(formattedValue);
    const cents = rawValue ? convertToCents(formattedValue) : 0;
    if (priceType === "perKg") {
      updateFormData("pricePerKgCents", cents.toString());
      updateFormData("priceCents", "0");
    } else {
      updateFormData("priceCents", cents.toString());
      updateFormData("pricePerKgCents", null);
    }
  };

  const handlePriceTypeChange = (type: "unit" | "perKg") => {
    hasInitializedPriceType.current = true;
    setPriceType(type);
    setDisplayPrice("");
    if (type === "perKg") {
      updateFormData("priceCents", "0");
      updateFormData("pricePerKgCents", "");
    } else {
      updateFormData("pricePerKgCents", null);
      updateFormData("priceCents", "");
    }
  };

  const generateRandomBarcode = () => {
    const prefix = Math.floor(Math.random() * 3) + 5;
    const randomSuffix = Math.floor(Math.random() * 1000000000000);
    const randomBarcode = prefix * 1000000000000 + randomSuffix;
    updateFormData("barcode", randomBarcode.toString());
  };

  const handleCroppedImageUpload = async (croppedImageFile: File) => {
    setIsUploadingImage(true);
    try {
      await handleFileUpload(croppedImageFile);
    } catch (error) {
      console.error("Error uploading cropped image:", error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = async () => {
    const imageUrl = formData.imageUrl;
    updateFormData("imageUrl", "");
    if (imageUrl) {
      try {
        await fetch("/api/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl }),
        });
      } catch (error) {
        console.warn("Could not delete image from storage:", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    setIsSubmitting(true);
    try {
      await onSubmit(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
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
                <Package className="h-5 w-5 text-primary" />
              </div>
              {editingProduct ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Atualize as informações do produto abaixo"
                : "Preencha os dados para cadastrar um novo produto"}
            </DialogDescription>
          </DialogHeader>

          <form
            id="product-form-modal"
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* ── Informações Básicas ── */}
              <SectionDivider label="Informações Básicas" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Nome do Produto <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="name"
                      placeholder="Digite o nome do produto"
                      value={formData.name || ""}
                      onChange={(e) => updateFormData("name", e.target.value)}
                      className="pl-9"
                      required
                    />
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Código de Barras */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Código de Barras
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="barcode"
                        placeholder="7891234567890"
                        value={formData.barcode || ""}
                        onChange={(e) => updateFormData("barcode", e.target.value)}
                        className="pl-9"
                      />
                      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateRandomBarcode}
                      className="px-3 flex-shrink-0"
                      title="Gerar código de barras aleatório"
                    >
                      <Package className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1.5">Gerar</span>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Categoria */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Categoria
                  </Label>
                  <div className="relative">
                    <select
                      id="category"
                      value={formData.category_id || ""}
                      onChange={(e) => updateFormData("category_id", e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none text-sm bg-white appearance-none"
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Preço */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Preço <span className="text-red-400">*</span>
                  </Label>
                  {/* Toggle tipo de preço */}
                  <div className="flex gap-4 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="radio"
                        name="priceType"
                        checked={priceType === "unit"}
                        onChange={() => handlePriceTypeChange("unit")}
                        className="w-3.5 h-3.5 text-primary focus:ring-primary/20"
                      />
                      <span className="text-xs font-medium text-slate-600">Unitário</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="radio"
                        name="priceType"
                        checked={priceType === "perKg"}
                        onChange={() => handlePriceTypeChange("perKg")}
                        className="w-3.5 h-3.5 text-primary focus:ring-primary/20"
                      />
                      <span className="text-xs font-medium text-slate-600">Por Quilo</span>
                    </label>
                  </div>
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                    <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 border-r border-slate-200 flex-shrink-0">
                      <Wallet className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-500">R$</span>
                    </div>
                    <input
                      value={displayPrice.replace(/^R\$\s?/, "")}
                      onChange={(e) => {
                        const raw = "R$ " + e.target.value;
                        const formatted = e.target.value ? formatCurrencyInput(raw) : "";
                        setDisplayPrice(formatted);
                        const cents = e.target.value ? convertToCents(formatted) : 0;
                        if (priceType === "perKg") {
                          updateFormData("pricePerKgCents", cents.toString());
                          updateFormData("priceCents", "0");
                        } else {
                          updateFormData("priceCents", cents.toString());
                          updateFormData("pricePerKgCents", null);
                        }
                      }}
                      className="flex-1 px-3 py-2.5 text-lg font-bold text-slate-900 bg-white outline-none placeholder:text-slate-300 placeholder:font-normal placeholder:text-base"
                      placeholder={priceType === "perKg" ? "0,00/kg" : "0,00"}
                    />
                  </div>
                  {priceType === "perKg" && (
                    <span className="inline-flex items-center text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5">
                      Por Quilo
                    </span>
                  )}
                </div>
              </div>

              {/* ── Tipo & Estoque ── */}
              <SectionDivider label="Tipo & Estoque" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tipo de Produto */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Tipo de Produto <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <select
                      id="productType"
                      value={formData.productType || "sellable"}
                      onChange={(e) => updateFormData("productType", e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none text-sm bg-white appearance-none"
                    >
                      <option value="sellable">Produto Vendável</option>
                      <option value="addon">Adicional/Complemento</option>
                    </select>
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Quantidade em Estoque */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Quantidade em Estoque
                  </Label>
                  <div className="relative">
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      disabled={!formData.stockEnabled}
                      placeholder="0"
                      value={formData.stock || ""}
                      onChange={(e) => updateFormData("stock", e.target.value)}
                      className="pl-9 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Toggle Controle de Estoque */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center"
                    style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
                  >
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Controle de Estoque</p>
                    <p className="text-xs text-slate-400">Gerenciar quantidade disponível</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateFormData("stockEnabled", !formData.stockEnabled)}
                  className={`relative h-6 w-11 rounded-full transition-colors flex-shrink-0 ${
                    formData.stockEnabled ? "bg-primary" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      formData.stockEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* ── Imagem do Produto ── */}
              <SectionDivider label="Imagem do Produto" />

              {formData.imageUrl ? (
                <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <img
                    src={formData.imageUrl}
                    alt="Produto"
                    className="h-20 w-20 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                  />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm text-slate-500">Imagem carregada com sucesso</p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCropModalOpen(true)}
                        className="flex items-center gap-1.5"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeImage}
                        className="flex items-center gap-1.5 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remover
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-primary/40 transition-colors">
                  <Image className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-600 mb-1">Selecione uma imagem</p>
                  <p className="text-xs text-slate-400 mb-4">
                    Clique para selecionar e editar uma imagem do produto
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCropModalOpen(true)}
                    disabled={isUploadingImage || isUploading}
                    className="gap-2"
                  >
                    {isUploadingImage || isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Escolher Imagem
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-slate-400 mt-3">JPG, PNG, WEBP, GIF — máx. 5MB</p>
                </div>
              )}

              {/* ── Descrição & Status ── */}
              <SectionDivider label="Descrição & Status" />

              {/* Descrição */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Descrição{" "}
                  <span className="text-slate-300 font-normal normal-case tracking-normal">— opcional</span>
                </Label>
                <div className="relative">
                  <Textarea
                    id="description"
                    placeholder="Descreva detalhes importantes sobre o produto"
                    value={formData.description || ""}
                    onChange={(e) => updateFormData("description", e.target.value)}
                    className="min-h-[100px] pr-8"
                  />
                  <FileText className="absolute right-3 bottom-3 h-4 w-4 text-slate-300" />
                </div>
              </div>

              {/* Toggle Status */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center"
                    style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
                  >
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Status do Produto</p>
                    <p className="text-xs text-slate-400">Ative ou desative a exibição do produto</p>
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
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" form="product-form-modal" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingProduct ? "Atualizando..." : "Cadastrando..."}
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4 mr-2" />
                      {editingProduct ? "Atualizar Produto" : "Cadastrar Produto"}
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        onCropComplete={handleCroppedImageUpload}
        onUploadStart={() => setIsUploadingImage(true)}
        aspectRatio={1}
        maxWidth={800}
        maxHeight={800}
        title="Editar Imagem do Produto"
        description="Ajuste e faça o crop da imagem para garantir que ela fique perfeita"
        selectImageTitle="Selecione uma imagem"
        selectImageDescription="Escolha uma imagem para editar e fazer o crop"
        cropButtonText="Aplicar e Salvar Imagem"
        selectAnotherButtonText="Escolher Outra Imagem"
      />
    </>
  );
}
