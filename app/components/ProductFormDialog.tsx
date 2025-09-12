"use client";

import {
  Barcode,
  Check,
  Edit3,
  FileText,
  Image,
  Package,
  Tag,
  Trash2,
  Upload,
  Wallet,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Category, Product } from "../admin/products/page";
import { ImageCropModal } from "./ImageCropModal";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isUploading: boolean;
  categories: Category[];
  editingProduct: Product | null;
  handleFileUpload: (file: File) => void;
  formatPriceToReais: (cents: number) => string;
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
  const [isClient, setIsClient] = useState(false);
  const [displayPrice, setDisplayPrice] = useState("");
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // Inicializa o displayPrice com o valor formatado
    if (formData.priceCents) {
      const cents = parseInt(formData.priceCents) || 0;
      setDisplayPrice(formatPriceToReais(cents));
    } else {
      setDisplayPrice("");
    }
  }, [formData.priceCents, formatPriceToReais]);

  if (!open || !isClient) return null;

  const updateFormData = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Função para formatar o valor digitado como moeda
  const formatCurrencyInput = (value: string): string => {
    // Remove tudo exceto números
    let cleanValue = value.replace(/\D/g, "");

    // Limita o valor máximo para evitar overflow
    if (cleanValue.length > 10) {
      cleanValue = cleanValue.substring(0, 10);
    }

    // Converte para número e formata como moeda
    const numericValue = parseInt(cleanValue) || 0;
    const formatted = (numericValue / 100).toFixed(2);

    // Adiciona separador de milhares e vírgula decimal
    return `R$ ${formatted
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
      .replace(".", ",")}`;
  };

  // Função para converter o valor formatado em centavos
  const convertToCents = (formattedValue: string): number => {
    // Remove "R$ " e substitui vírgula por ponto
    const cleanValue = formattedValue
      .replace("R$ ", "")
      .replace(/\./g, "")
      .replace(",", ".");
    return Math.round(parseFloat(cleanValue) * 100);
  };

  // Função para lidar com a mudança no campo de preço
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;

    // Atualiza o displayPrice com o valor formatado
    const formattedValue = rawValue ? formatCurrencyInput(rawValue) : "";
    setDisplayPrice(formattedValue);

    // Converte para centavos e atualiza o formData
    const cents = rawValue ? convertToCents(formattedValue) : 0;
    updateFormData("priceCents", cents.toString());
  };

  const generateRandomBarcode = () => {
    const prefix = Math.floor(Math.random() * 3) + 5;
    const randomSuffix = Math.floor(Math.random() * 1000000000000);
    const randomBarcode = prefix * 1000000000000 + randomSuffix;
    updateFormData("barcode", randomBarcode.toString());
  };

  // Handle cropped image upload
  const handleCroppedImageUpload = async (croppedImageFile: File) => {
    setIsUploadingImage(true);
    try {
      await handleFileUpload(croppedImageFile);
    } catch (error) {
      console.error('Error uploading cropped image:', error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Remove current image
  const removeImage = async () => {
    const imageUrl = formData.imageUrl;
    updateFormData("imageUrl", "");
    
    // Optionally delete the image from storage
    if (imageUrl) {
      try {
        await fetch('/api/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl })
        });
      } catch (error) {
        console.warn('Could not delete image from storage:', error);
        // Don\'t show error to user as the main action (removing from form) succeeded
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl max-h-[95vh] overflow-hidden bg-white shadow-2xl rounded-2xl border border-gray-200 flex flex-col">
        {/* Header with gradient and shadow */}
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 sticky top-0 z-20 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-600" />
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1 text-sm">
                {editingProduct
                  ? "Atualize as informações do produto"
                  : "Preencha os dados para cadastrar um novo produto"}
              </CardDescription>
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
        </CardHeader>
        
        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto">
          <CardContent className="p-6">
            <form
              id="product-form-modal"
              onSubmit={onSubmit}
              className="space-y-6"
            >
              {/* Seção Informações Básicas */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2">
                  <Package className="h-4 w-4 text-orange-600" />
                  <h3 className="text-base font-semibold text-orange-800">
                    Informações Básicas
                  </h3>
                </div>
                <div className="mt-3 h-px bg-gradient-to-r from-orange-100 via-orange-300 to-orange-100"></div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-sm font-medium text-gray-700 flex items-center gap-1"
                    >
                      Nome do Produto <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="name"
                        placeholder="Digite o nome do produto"
                        value={formData.name || ""}
                        onChange={(e) => updateFormData("name", e.target.value)}
                        className="pl-10 py-3 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all"
                        required
                      />
                      <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="barcode"
                      className="text-sm font-medium text-gray-700"
                    >
                      Código de Barras
                    </Label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Input
                          id="barcode"
                          placeholder="7891234567890"
                          value={formData.barcode || ""}
                          onChange={(e) =>
                            updateFormData("barcode", e.target.value)
                          }
                          className="pl-10 py-3 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500/20 shadow-sm transition-all"
                        />
                        <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateRandomBarcode}
                        className="px-4 py-3 border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-all flex items-center gap-2"
                        title="Gerar código de barras aleatório"
                      >
                        <Package className="h-4 w-4" />
                        <span className="hidden sm:inline">Gerar</span>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="category"
                      className="text-sm font-medium text-gray-700"
                    >
                      Categoria
                    </Label>
                    <div className="relative">
                      <select
                        id="category"
                        value={formData.category_id || ""}
                        onChange={(e) =>
                          updateFormData("category_id", e.target.value)
                        }
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 focus:outline-none shadow-sm transition-all appearance-none bg-white"
                      >
                        <option value="">Selecione uma categoria</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="price"
                      className="text-sm font-medium text-gray-700"
                    >
                      Preço <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        id="price"
                        value={displayPrice}
                        onChange={handlePriceChange}
                        className="pl-10 pr-4 py-3 w-full rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 focus:outline-none shadow-sm transition-all"
                        placeholder="R$ 0,00"
                      />
                    </div>
                    {formData.priceCents &&
                      parseInt(formData.priceCents) > 0 && (
                        <p className="text-sm text-gray-500">
                          Valor em centavos: {formData.priceCents}
                        </p>
                      )}
                  </div>
                </div>
              </div>

              {/* Seção Tipo */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 mt-6">
                  <Tag className="h-4 w-4 text-orange-600" />
                  <h3 className="text-base font-semibold text-orange-800">Tipo</h3>
                </div>
                <div className="mt-3 h-px bg-gradient-to-r from-orange-100 via-orange-300 to-orange-100"></div>
                
                <div className="space-y-2 mt-4">
                  <Label
                    htmlFor="productType"
                    className="text-sm font-medium text-gray-700"
                  >
                    Tipo de Produto <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <select
                      id="productType"
                      value={formData.productType || "sellable"}
                      onChange={(e) =>
                        updateFormData("productType", e.target.value)
                      }
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 focus:outline-none shadow-sm transition-all appearance-none bg-white"
                    >
                      <option value="sellable">Produto Vendável</option>
                      <option value="addon">Adicional/Complemento</option>
                    </select>
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Seção Estoque */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 mt-6">
                  <Package className="h-4 w-4 text-orange-600" />
                  <h3 className="text-base font-semibold text-orange-800">
                    Estoque
                  </h3>
                </div>
                <div className="mt-3 h-px bg-gradient-to-r from-orange-100 via-orange-300 to-orange-100"></div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="stock"
                      className="text-sm font-medium text-gray-700"
                    >
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
                        className="pl-10 py-3 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all"
                      />
                      <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  
                  <div className="space-y-2 flex items-end">
                    <div className="w-full">
                      <Label className="text-sm font-medium text-gray-700">
                        Controle de Estoque
                      </Label>
                      <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-200 mt-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <Package className="h-5 w-5 text-orange-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">Controle Ativo</h4>
                            <p className="text-sm text-gray-600">Gerenciar estoque</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => updateFormData("stockEnabled", !formData.stockEnabled)}
                          className={`relative h-6 w-11 rounded-full border-2 transition-colors ${
                            formData.stockEnabled 
                              ? 'border-orange-500 bg-orange-500' 
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                            formData.stockEnabled ? 'translate-x-5' : 'translate-x-0.5'
                          }`}></span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção Imagem */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 mt-6">
                  <Image className="h-4 w-4 text-orange-600" />
                  <h3 className="text-base font-semibold text-orange-800">
                    Imagem do Produto
                  </h3>
                </div>
                <div className="mt-3 h-px bg-gradient-to-r from-orange-100 via-orange-300 to-orange-100"></div>
                
                <div className="space-y-4 mt-4">
                  {formData.imageUrl ? (
                    // Image preview with edit/remove options
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        Imagem Atual
                      </Label>
                      <div className="relative">
                        <div className="flex items-start gap-4 p-4 border border-orange-200 rounded-xl bg-orange-50">
                          <img
                            src={formData.imageUrl}
                            alt="Produto"
                            className="h-24 w-24 rounded-lg object-cover border border-orange-300"
                          />
                          <div className="flex-1 space-y-2">
                            <p className="text-sm text-gray-600">
                              Imagem carregada com sucesso
                            </p>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsCropModalOpen(true)}
                                className="flex items-center gap-2 border-orange-200 hover:bg-orange-100 text-orange-700"
                              >
                                <Edit3 className="h-4 w-4" />
                                Editar
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={removeImage}
                                className="flex items-center gap-2 border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remover
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Upload area when no image
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        Adicionar Imagem
                      </Label>
                      <div className="border-2 border-dashed border-orange-300 rounded-xl p-8 text-center hover:border-orange-500 transition-colors bg-orange-50/50">
                        <Image className="h-12 w-12 text-orange-400 mx-auto mb-3" />
                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                          Selecione uma imagem
                        </h4>
                        <p className="text-sm text-gray-500 mb-4">
                          Clique para selecionar e editar uma imagem do produto
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCropModalOpen(true)}
                          disabled={isUploadingImage || isUploading}
                          className="bg-orange-600 hover:bg-orange-700 border-orange-700 text-white hover:text-white px-4 py-3 rounded-xl"
                        >
                          {isUploadingImage || isUploading ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></div>
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Escolher e Editar Imagem
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-orange-400 mt-3">
                          Formatos suportados: JPG, PNG, WEBP, GIF (máx. 5MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Seção Descrição */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 mt-6">
                  <FileText className="h-4 w-4 text-orange-600" />
                  <h3 className="text-base font-semibold text-orange-800">
                    Descrição
                  </h3>
                </div>
                <div className="mt-3 h-px bg-gradient-to-r from-orange-100 via-orange-300 to-orange-100"></div>
                
                <div className="space-y-2 mt-4">
                  <Label
                    htmlFor="description"
                    className="text-sm font-medium text-gray-700"
                  >
                    Descrição Detalhada
                  </Label>
                  <div className="relative">
                    <Textarea
                      id="description"
                      placeholder="Descreva detalhes importantes sobre o produto"
                      value={formData.description || ""}
                      onChange={(e) =>
                        updateFormData("description", e.target.value)
                      }
                      className="pl-4 py-3 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 min-h-[120px] shadow-sm transition-all"
                    />
                    <FileText className="absolute right-3 bottom-3 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Seção Status */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <Check className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Status do Produto</h4>
                      <p className="text-sm text-gray-600">Ative ou desative o produto</p>
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
          </CardContent>
        </div>
        
        {/* Rodapé fixo */}
        <div className="sticky bottom-0 z-20 bg-gray-50/50 border-t border-gray-200 px-6 py-6">
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
              form="product-form-modal"
              className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-lg hover:shadow-xl transition-all"
            >
              {editingProduct ? "Atualizar Produto" : "Cadastrar Produto"}
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        onCropComplete={handleCroppedImageUpload}
        onUploadStart={() => setIsUploadingImage(true)}
        aspectRatio={1} // Square aspect ratio for product images
        maxWidth={800}
        maxHeight={800}
      />
    </div>
  );
}