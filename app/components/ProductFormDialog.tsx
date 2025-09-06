"use client";

import {
    Barcode,
    Edit3,
    FileText,
    Image,
    Package,
    Tag,
    ToggleRight,
    Trash2,
    Upload,
    Wallet,
    X,
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl max-h-[80vh] bg-white shadow-2xl border-0 my-8 flex flex-col">
        {/* Header fixo */}
        <CardHeader className="border-b border-gray-200 sticky top-0 z-20 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Package className="h-6 w-6 text-primary" />
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </CardTitle>
              <CardDescription className="text-base">
                {editingProduct
                  ? "Atualize as informações do produto"
                  : "Preencha os dados para cadastrar um novo produto"}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10 rounded-lg hover:bg-gray-100"
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
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Package className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-800">
                    Informações Básicas
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-sm font-medium text-gray-700"
                    >
                      Nome do Produto <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="Digite o nome do produto"
                      value={formData.name || ""}
                      onChange={(e) => updateFormData("name", e.target.value)}
                      className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="barcode"
                      className="text-sm font-medium text-gray-700"
                    >
                      Código de Barras
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="barcode"
                        placeholder="7891234567890"
                        value={formData.barcode || ""}
                        onChange={(e) =>
                          updateFormData("barcode", e.target.value)
                        }
                        className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateRandomBarcode}
                        className="px-3 py-2 border-gray-200 hover:bg-gray-50 text-xs"
                        title="Gerar código de barras aleatório"
                      >
                        <Barcode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="category"
                      className="text-sm font-medium text-gray-700"
                    >
                      Categoria
                    </Label>
                    <select
                      id="category"
                      value={formData.category_id || ""}
                      onChange={(e) =>
                        updateFormData("category_id", e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:ring-primary/20 focus:outline-none"
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="price"
                      className="text-sm font-medium text-gray-700"
                    >
                      Preço <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <input
                        id="price"
                        value={displayPrice}
                        onChange={handlePriceChange}
                        className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-200 focus:border-primary focus:ring-primary/20 focus:outline-none"
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
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Tag className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-800">Tipo</h3>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="productType"
                    className="text-sm font-medium text-gray-700"
                  >
                    Tipo de Produto <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="productType"
                    value={formData.productType || "sellable"}
                    onChange={(e) =>
                      updateFormData("productType", e.target.value)
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:ring-primary/20 focus:outline-none"
                    required
                  >
                    <option value="sellable">Produto Vendável</option>
                    <option value="addon">Adicional/Complemento</option>
                  </select>
                </div>
              </div>

              {/* Seção Estoque */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Package className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-800">
                    Estoque
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 flex items-end">
                    <div className="flex items-center justify-between w-full">
                      <Label className="text-sm font-medium text-gray-700">
                        Controle de Estoque
                      </Label>
                      <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!formData.stockEnabled}
                            onChange={(e) =>
                              updateFormData("stockEnabled", e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Ative para controlar a quantidade em estoque
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="stock"
                      className="text-sm font-medium text-gray-700"
                    >
                      Quantidade em Estoque
                    </Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      disabled={!formData.stockEnabled}
                      placeholder="0"
                      value={formData.stock || ""}
                      onChange={(e) => updateFormData("stock", e.target.value)}
                      className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>

              {/* Seção Imagem */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Image className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-800">
                    Imagem do Produto
                  </h3>
                </div>

                <div className="space-y-4">
                  {formData.imageUrl ? (
                    // Image preview with edit/remove options
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        Imagem Atual
                      </Label>
                      <div className="relative">
                        <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                          <img
                            src={formData.imageUrl}
                            alt="Produto"
                            className="h-24 w-24 rounded-lg object-cover border border-gray-300"
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
                                className="flex items-center gap-2"
                              >
                                <Edit3 className="h-4 w-4" />
                                Editar
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={removeImage}
                                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
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
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
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
                          className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
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
                        <p className="text-xs text-gray-400 mt-3">
                          Formatos suportados: JPG, PNG, WEBP, GIF (máx. 5MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Seção Descrição */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-800">
                    Descrição
                  </h3>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="description"
                    className="text-sm font-medium text-gray-700"
                  >
                    Descrição Detalhada
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva detalhes importantes sobre o produto"
                    value={formData.description || ""}
                    onChange={(e) =>
                      updateFormData("description", e.target.value)
                    }
                    className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20 min-h-[100px]"
                  />
                </div>
              </div>

              {/* Seção Status */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <ToggleRight className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-gray-800">
                      Status
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="active"
                      className="text-sm font-medium text-gray-700"
                    >
                      Produto Ativo
                    </Label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="active"
                        type="checkbox"
                        checked={!!formData.active}
                        onChange={(e) =>
                          updateFormData("active", e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Produtos inativos não aparecem no catálogo para os clientes
                </p>
              </div>

              {/* Botões de Ação - removido daqui, vai para o rodapé fixo */}
            </form>
          </CardContent>
        </div>
        {/* Rodapé fixo */}
        <div className="sticky bottom-0 z-20 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="px-6 py-2 rounded-lg border-gray-200 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="product-form-modal"
            className="bg-primary hover:bg-primary/90 px-6 py-2 rounded-lg"
          >
            {editingProduct ? "Atualizar Produto" : "Cadastrar Produto"}
          </Button>
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
