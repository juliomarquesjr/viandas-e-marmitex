"use client";

import {
    Barcode,
    Check,
    Edit3,
    FileText,
    Image,
    Loader2,
    Package,
    Plus,
    Shapes,
    Tag,
    Trash2,
    Upload,
    Wallet,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Category, Product } from "../page";
import { useToast } from "@/app/components/Toast";
import { ProductPhotoModal } from "./ProductPhotoModal";
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
import { SectionDivider } from "@/app/components/ui/section-divider";
import { CategoryIconPicker, DynamicCategoryIcon } from "./CategoryIconPicker";

interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent, finalImageUrl?: string) => Promise<void> | void;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isUploading: boolean;
  categories: Category[];
  editingProduct: Product | null;
  formatPriceToReais: (cents: number) => string;
  onCategoryAdded?: (newCategory: Category) => void;
}

type FormErrors = Partial<Record<"name" | "barcode" | "priceCents" | "pricePerKgCents" | "productType" | "stock", string>>;
type FormTouched = Partial<Record<"name" | "barcode" | "priceCents" | "pricePerKgCents" | "productType" | "stock", boolean>>;

export function ProductFormDialog({
  open,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isUploading,
  categories,
  editingProduct,
  formatPriceToReais,
  onCategoryAdded,
}: ProductFormDialogProps) {
  const { showToast } = useToast();
  const [displayPrice, setDisplayPrice] = useState("");
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priceType, setPriceType] = useState<"unit" | "perKg">("unit");
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [oldImageUrl, setOldImageUrl] = useState<string | null>(null);
  const hasInitializedPriceType = useRef(false);
  const previousOpenState = useRef(false);

  // Quick-add de categoria
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddIcon, setQuickAddIcon] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Determinar tipo de preço apenas quando o modal abre pela primeira vez
  useEffect(() => {
    if (!open) {
      if (previousOpenState.current) {
        setPriceType("unit");
        setDisplayPrice("");
        hasInitializedPriceType.current = false;
        setIsSubmitting(false);
        setErrors({});
        setTouched({});
        
        // Limpa imagem pendente e revoga URL temporária
        if (pendingImageFile) {
          setPendingImageFile(null);
        }
        if (formData.imageUrl && formData.imageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(formData.imageUrl);
        }
        // Limpa oldImageUrl
        setOldImageUrl(null);
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
  }, [open, formatPriceToReais, formData.priceCents, formData.pricePerKgCents]);

  // Inicializar productType vazio ao abrir o modal
  useEffect(() => {
    if (open && !formData.productType) {
      updateFormData("productType", "");
    }
  }, [open]);

  const validateField = (field: keyof FormErrors, value: any): string | undefined => {
    switch (field) {
      case "name":
        return !value || value.trim() === "" ? "Obrigatório" : undefined;
      case "barcode":
        return !value || value.trim() === "" ? "Obrigatório" : undefined;
      case "priceCents":
        return (!value || value <= 0) ? "Informe um valor maior que zero" : undefined;
      case "pricePerKgCents":
        return (!value || value <= 0) ? "Informe um valor maior que zero" : undefined;
      case "productType":
        return !value || value === "" ? "Obrigatório" : undefined;
      case "stock":
        // Stock é obrigatório apenas se o controle de estoque estiver ativo
        if (formData.stockEnabled) {
          return (!value || value < 0) ? "Informe a quantidade em estoque" : undefined;
        }
        return undefined;
      default:
        return undefined;
    }
  };

  const validateForm = (): boolean => {
    const fields: Array<keyof FormErrors> = [
      "name",
      "barcode",
      "productType",
      priceType === "perKg" ? "pricePerKgCents" : "priceCents"
    ];
    
    // Adiciona stock apenas se o controle de estoque estiver ativo
    if (formData.stockEnabled) {
      fields.push("stock");
    }
    
    const newErrors: FormErrors = {};
    let valid = true;
    
    fields.forEach((field) => {
      const err = validateField(field, formData[field]);
      if (err) {
        newErrors[field] = err;
        valid = false;
      }
    });
    
    setErrors(newErrors);
    setTouched({ name: true, barcode: true, priceCents: true, pricePerKgCents: true, productType: true, stock: true });
    return valid;
  };

  const err = (field: keyof FormErrors) =>
    touched[field] && errors[field] ? "border-red-400 focus:ring-red-400/20" : "";

  const saveQuickCategory = async () => {
    if (!quickAddName.trim()) return;
    try {
      setIsSavingCategory(true);
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: quickAddName.trim(), icon: quickAddIcon || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao criar categoria");
      onCategoryAdded?.(data);
      updateFormData("category_id", data.id);
      setIsQuickAddOpen(false);
      setQuickAddName("");
      setQuickAddIcon(null);
      showToast("Categoria criada", "success");
    } catch (e: any) {
      showToast(e?.message || "Erro ao criar categoria", "error");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const errText = (field: keyof FormErrors) =>
    touched[field] && errors[field] ? errors[field] : null;

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

  const handlePhotoSelected = (photoFile: File) => {
    // Armazena a URL da imagem antiga antes de substituir (para deleção posterior)
    if (formData.imageUrl && !formData.imageUrl.startsWith('blob:')) {
      setOldImageUrl(formData.imageUrl);
    }
    
    // Apenas armazena o arquivo em memória temporariamente
    // O upload será feito apenas no submit do formulário
    setPendingImageFile(photoFile);
    
    // Cria uma URL temporária para preview
    const tempUrl = URL.createObjectURL(photoFile);
    updateFormData("imageUrl", tempUrl);
  };

  const removeImage = () => {
    const imageUrl = formData.imageUrl;
    
    // Se a imagem atual é do storage (não temporária), armazena para possível deleção futura
    // ou marca que queremos remover a imagem existente
    if (imageUrl && !imageUrl.startsWith('blob:')) {
      // Se já havia uma imagem antiga pendente de deleção, mantém
      // A imagem será removida do produto, mas não do storage ainda
      // (a deleção do storage só ocorre quando há substituição)
      setOldImageUrl(imageUrl);
    }
    
    updateFormData("imageUrl", "");
    setPendingImageFile(null);

    // Revoga URL temporária se existir
    if (imageUrl && imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast("Por favor, preencha todos os campos obrigatórios", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalImageUrl = formData.imageUrl;
      
      // Se houver uma imagem pendente, faz o upload agora
      if (pendingImageFile) {
        setIsUploadingImage(true);
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("file", pendingImageFile);

          // Envia a URL da imagem antiga para deleção (se existir)
          if (oldImageUrl) {
            uploadFormData.append("oldImageUrl", oldImageUrl);
          }

          const response = await fetch("/api/upload", {
            method: "POST",
            body: uploadFormData,
          });

          if (response.ok) {
            const { url } = await response.json();
            
            // Revoga URL temporária
            if (formData.imageUrl && formData.imageUrl.startsWith('blob:')) {
              URL.revokeObjectURL(formData.imageUrl);
            }
            // Atualiza com URL real do storage
            finalImageUrl = url;
            updateFormData("imageUrl", url);
            setPendingImageFile(null);
            setOldImageUrl(null);
          } else {
            showToast("Não foi possível fazer o upload da imagem. Tente novamente.", "error", "Erro no upload");
            return; // Interrompe o submit se falhar upload da imagem
          }
        } catch (error) {
          showToast("Não foi possível fazer o upload da imagem. Tente novamente.", "error", "Erro no upload");
          return; // Interrompe o submit se falhar upload da imagem
        } finally {
          setIsUploadingImage(false);
        }
      }

      // Agora prossegue com o submit do formulário, passando a URL final garantida
      await onSubmit(e, finalImageUrl);
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
                      className={`pl-9 ${err("name")}`}
                    />
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                  {errText("name") && (
                    <p className="text-xs text-red-500 mt-0.5">{errText("name")}</p>
                  )}
                </div>

                {/* Código de Barras */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Código de Barras <span className="text-red-400">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="barcode"
                        placeholder="7891234567890"
                        value={formData.barcode || ""}
                        onChange={(e) => updateFormData("barcode", e.target.value)}
                        className={`pl-9 ${err("barcode")}`}
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
                  {errText("barcode") && (
                    <p className="text-xs text-red-500 mt-0.5">{errText("barcode")}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Categoria */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Categoria
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
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
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      title="Adicionar categoria"
                      onClick={() => {
                        setQuickAddName("");
                        setQuickAddIcon(null);
                        setIsQuickAddOpen(true);
                      }}
                      className="flex-shrink-0 h-9 w-9"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
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
                  <div
                    className={`flex items-center border rounded-xl overflow-hidden transition-all ${
                      touched.priceCents && errors.priceCents
                        ? "border-red-400 ring-2 ring-red-400/15"
                        : "border-slate-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15"
                    }`}
                  >
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
                  {(errText("priceCents") || errText("pricePerKgCents")) && (
                    <p className="text-xs text-red-500 mt-0.5">
                      {errText("pricePerKgCents") || errText("priceCents")}
                    </p>
                  )}
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
                      value={formData.productType || ""}
                      onChange={(e) => updateFormData("productType", e.target.value)}
                      className={`w-full pl-9 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary/15 focus:outline-none text-sm bg-white appearance-none ${
                        err("productType") || "border-slate-200 focus:border-primary"
                      }`}
                    >
                      <option value="">Selecione um tipo</option>
                      <option value="sellable">Produto Vendável</option>
                      <option value="addon">Adicional/Complemento</option>
                    </select>
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  {errText("productType") && (
                    <p className="text-xs text-red-500 mt-0.5">{errText("productType")}</p>
                  )}
                </div>

                {/* Quantidade em Estoque */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Quantidade em Estoque {formData.stockEnabled && <span className="text-red-400">*</span>}
                  </Label>
                  <div className="relative">
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      disabled={!formData.stockEnabled}
                      placeholder={formData.stockEnabled ? "Digite a quantidade" : "0"}
                      value={formData.stock || ""}
                      onChange={(e) => updateFormData("stock", e.target.value)}
                      className={`pl-9 disabled:opacity-50 disabled:cursor-not-allowed ${err("stock")}`}
                    />
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                  {errText("stock") && (
                    <p className="text-xs text-red-500 mt-0.5">{errText("stock")}</p>
                  )}
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
                        onClick={() => setIsPhotoModalOpen(true)}
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
                    onClick={() => setIsPhotoModalOpen(true)}
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

      <ProductPhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        currentPhotoUrl={formData.imageUrl}
        onPhotoSelected={handlePhotoSelected}
        onRemovePhoto={removeImage}
      />

      {/* ── Quick-add de categoria ── */}
      <Dialog open={isQuickAddOpen} onOpenChange={(v) => !v && setIsQuickAddOpen(false)}>
        <DialogContent className="sm:max-w-sm" higherZIndex>
          <DialogHeader>
            <DialogTitle>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                style={{
                  background: "var(--modal-header-icon-bg)",
                  outline: "1px solid var(--modal-header-icon-ring)",
                }}
              >
                <Shapes className="h-5 w-5 text-primary" />
              </div>
              Nova Categoria
            </DialogTitle>
            <DialogDescription>
              Crie uma categoria rapidamente para este produto
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Nome <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Input
                  value={quickAddName}
                  onChange={(e) => setQuickAddName(e.target.value)}
                  className="pl-9"
                  placeholder="Ex: Marmitas"
                  autoFocus
                />
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Ícone */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Ícone
              </Label>
              <CategoryIconPicker value={quickAddIcon} onChange={setQuickAddIcon} />
            </div>
          </div>

          <DialogFooter>
            <div className="flex items-center gap-2 w-full justify-end">
              <Button variant="outline" onClick={() => setIsQuickAddOpen(false)} disabled={isSavingCategory}>
                Cancelar
              </Button>
              <Button onClick={saveQuickCategory} disabled={isSavingCategory || !quickAddName.trim()}>
                {isSavingCategory ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                    Salvando...
                  </span>
                ) : (
                  "Criar"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
