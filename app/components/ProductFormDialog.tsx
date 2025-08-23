import { X } from "lucide-react";
import type { Category, Product } from "../admin/products/page";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";

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
  handlePriceChange: (value: string) => void;
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
  handlePriceChange,
  formatPriceToReais,
}: ProductFormDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl border-0">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </CardTitle>
              <CardDescription>
                {editingProduct
                  ? "Atualize as informações do produto"
                  : "Preencha os dados para cadastrar um novo produto"}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Nome do Produto *
                </label>
                <Input
                  placeholder="Digite o nome do produto"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Código de Barras
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="7891234567890"
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        barcode: e.target.value,
                      }))
                    }
                    className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const prefix = Math.floor(Math.random() * 3) + 5;
                      const randomSuffix = Math.floor(
                        Math.random() * 1000000000000
                      );
                      const randomBarcode =
                        prefix * 1000000000000 + randomSuffix;
                      setFormData((prev: any) => ({
                        ...prev,
                        barcode: randomBarcode.toString(),
                      }));
                    }}
                    className="px-3 py-2 border-gray-200 hover:bg-gray-50 text-xs"
                    title="Gerar código de barras aleatório"
                  >
                    {/* Ícone de código de barras */}
                    <span className="font-bold">#</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Categoria
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      category_id: e.target.value,
                    }))
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
                <label className="text-sm font-medium text-gray-700">
                  Preço *
                </label>
                <Input
                  type="text"
                  placeholder="R$ 25,00"
                  value={
                    formData.priceCents &&
                    formData.priceCents !== "" &&
                    !isNaN(parseInt(formData.priceCents)) &&
                    parseInt(formData.priceCents) > 0
                      ? formatPriceToReais(parseInt(formData.priceCents))
                      : ""
                  }
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Controle de Estoque
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                      <input
                        type="checkbox"
                        checked={formData.stockEnabled}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            stockEnabled: e.target.checked,
                          }))
                        }
                        className="peer h-6 w-11 rounded-full border-2 border-gray-300 bg-gray-200 transition-colors checked:border-primary checked:bg-primary focus:outline-none focus:ring-0"
                      />
                      <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"></span>
                    </div>
                    <span className="text-sm text-gray-700">
                      Ativar controle de estoque
                    </span>
                  </label>
                </div>
                {formData.stockEnabled && (
                  <div className="mt-2">
                    <Input
                      type="number"
                      placeholder="50"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          stock: e.target.value,
                        }))
                      }
                      className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Tipo de Produto *
                </label>
                <select
                  value={formData.productType}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      productType: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:ring-primary/20 focus:outline-none"
                  required
                >
                  <option value="sellable">Produto Vendável</option>
                  <option value="addon">Adicional/Complemento</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Produto Variável
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                      <input
                        type="checkbox"
                        checked={formData.variableProduct}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            variableProduct: e.target.checked,
                          }))
                        }
                        className="peer h-6 w-11 rounded-full border-2 border-gray-300 bg-gray-200 transition-colors checked:border-primary checked:bg-primary focus:outline-none focus:ring-0"
                      />
                      <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"></span>
                    </div>
                    <span className="text-sm text-gray-700">
                      Produto com variações (tamanhos, cores, etc.)
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Imagem do Produto
                </label>
                <div className="space-y-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file);
                      }
                    }}
                    disabled={isUploading}
                    className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                  />
                  {isUploading && (
                    <div className="text-sm text-muted-foreground">
                      Enviando imagem...
                    </div>
                  )}
                  {formData.imageUrl && (
                    <div className="mt-2">
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="h-20 w-20 rounded-md object-cover"
                      />
                    </div>
                  )}
                  <Input
                    placeholder="ou insira uma URL diretamente"
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        imageUrl: e.target.value,
                      }))
                    }
                    className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Descrição
              </label>
              <Input
                placeholder="Descrição detalhada do produto"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        active: e.target.checked,
                      }))
                    }
                    className="peer h-6 w-11 rounded-full border-2 border-gray-300 bg-gray-200 transition-colors checked:border-primary checked:bg-primary focus:outline-none focus:ring-0"
                  />
                  <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"></span>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Produto ativo
                </span>
              </label>
            </div>

            {/* Separator */}
            <div className="border-t border-gray-200 my-6"></div>

            <div className="flex justify-end gap-3">
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
                className="bg-primary hover:bg-primary/90 px-6 py-2 rounded-lg"
              >
                {editingProduct ? "Atualizar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
