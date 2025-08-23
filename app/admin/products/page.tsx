"use client";

import {
  AlertCircle,
  Check,
  DollarSign,
  Edit,
  Image as ImageIcon,
  MoreVertical,
  Package,
  Plus,
  Search,
  Trash2,
  Barcode as BarcodeIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import React from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { DeleteProductDialog } from "../../components/DeleteProductDialog";
import { ProductFormDialog } from "../../components/ProductFormDialog";
import { useToast } from "../../components/Toast";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
// Menu de opções por produto
function ProductActionsMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 p-0"
        aria-label="Mais opções"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical className="h-5 w-5 text-gray-500" />
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg py-1 animate-fade-in">
          <button
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            <Edit className="h-4 w-4 mr-2 text-blue-500" /> Editar
          </button>
          <button
            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Remover
          </button>
        </div>
      )}
    </div>
  );
}

export type Product = {
  id: string;
  name: string;
  barcode?: string;
  categoryId?: string;
  priceCents: number;
  active: boolean;
  createdAt: string;
  description?: string;
  stockEnabled: boolean;
  stock?: number;
  imageUrl?: string;
  productType: "sellable" | "addon";
};

export type Category = {
  id: string;
  name: string;
};

export default function AdminProductsPage() {
  const { showToast } = useToast();

  // Estados de dados
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados do formulário
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    barcode: "",
    category_id: "",
    priceCents: "",
    description: "",
    stockEnabled: false,
    stock: "",
    active: true,
    imageUrl: "",
    productType: "sellable" as Product["productType"],
  });
  const [isUploading, setIsUploading] = useState(false);

  // Estados de alerta
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Função para lidar com o upload de arquivos
  const handleFileUpload = async (file: File) => {
    console.log("Iniciando upload do arquivo:", file.name);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      console.log("FormData criado");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      console.log("Resposta do servidor:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log("Erro na resposta:", errorData);
        throw new Error(errorData.error || "Falha no upload");
      }

      const { url } = await response.json();
      console.log("URL recebida:", url);
      setFormData((prev) => ({ ...prev, imageUrl: url }));
    } catch (error) {
      console.error("Erro no upload:", error);
      alert(
        error instanceof Error ? error.message : "Falha no upload da imagem"
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Estados de filtros e busca
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "sellable" | "addon">(
    "all"
  );

  // Estados de confirmação
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Carregar produtos e categorias
  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/products?q=${searchTerm}&category=${categoryFilter}&status=${statusFilter}&type=${typeFilter}`
      );
      if (!response.ok) throw new Error("Failed to fetch products");
      const result = await response.json();
      setProducts(result.data);
      setCategories(result.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  // Carregar produtos na montagem e quando filtros mudarem
  useEffect(() => {
    loadProducts();
  }, [searchTerm, categoryFilter, statusFilter, typeFilter]);

  // Funções auxiliares
  const resetForm = () => {
    setFormData({
      name: "",
      barcode: "",
      category_id: "",
      priceCents: "",
      description: "",
      stockEnabled: false,
      stock: "",
      active: true,
      imageUrl: "",
      productType: "sellable",
    });
  };

  // Função para gerar e baixar o código de barras
  const downloadBarcode = async (product: Product) => {
    if (!product.barcode) {
      alert("Este produto não possui um código de barras definido.");
      return;
    }

    try {
      // Usar uma API online para gerar o código de barras
      const barcodeUrl = `https://barcodeapi.org/api/code128/${product.barcode}`;
      
      // Criar um elemento de imagem
      const img = new Image();
      img.crossOrigin = "Anonymous";
      
      img.onload = () => {
        // Criar um canvas para desenhar a imagem
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          alert("Não foi possível gerar o código de barras.");
          return;
        }
        
        // Definir o tamanho do canvas
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Desenhar a imagem no canvas
        ctx.drawImage(img, 0, 0);
        
        // Converter o canvas para blob e baixar
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `barcode-${product.name.replace(/\s+/g, "-")}-${product.barcode}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        });
      };
      
      img.onerror = () => {
        alert("Erro ao gerar o código de barras.");
      };
      
      // Iniciar o carregamento da imagem
      img.src = barcodeUrl;
    } catch (error) {
      alert("Erro ao gerar o código de barras.");
      console.error(error);
    }
  };

  const openForm = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        barcode: product.barcode || "",
        category_id: product.categoryId || "",
        priceCents: product.priceCents.toString(),
        description: product.description || "",
        stockEnabled: product.stockEnabled,
        stock: product.stock?.toString() || "",
        active: product.active,
        imageUrl: product.imageUrl || "",
        productType: product.productType,
      });
    } else {
      setEditingProduct(null);
      resetForm();
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Converter o preço formatado para centavos
    let priceCents = 0;
    if (formData.priceCents) {
      priceCents = parseInt(formData.priceCents);
    }

    // Validação do preço
    if (isNaN(priceCents) || priceCents <= 0) {
      alert("Por favor, insira um preço válido maior que zero.");
      return;
    }

    try {
      const productData = {
        name: formData.name,
        barcode: formData.barcode || undefined,
        categoryId: formData.category_id || undefined,
        priceCents: priceCents,
        description: formData.description || undefined,
        stockEnabled: formData.stockEnabled,
        stock:
          formData.stockEnabled && formData.stock
            ? parseInt(formData.stock)
            : undefined,
        active: formData.active,
        imageUrl: formData.imageUrl || undefined,
        productType: formData.productType,
      };

      if (editingProduct) {
        // Editar produto existente
        const response = await fetch(`/api/products`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingProduct.id, ...productData }),
        });

        if (!response.ok) throw new Error("Failed to update product");
        const updatedProduct = await response.json();

        // Verificar se o código de barras foi alterado
        if (
          editingProduct.barcode !== updatedProduct.barcode &&
          updatedProduct.barcode
        ) {
          setConfirmMessage(
            `Atenção: O código de barras do produto será alterado para ${updatedProduct.barcode}. Certifique-se de atualizar qualquer etiqueta física associada.`
          );
          setPendingAction(() => () => {
            setProducts((prev) =>
              prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
            );
            showToast("Produto atualizado com sucesso!", "success");
          });
          setIsConfirmOpen(true);
        } else {
          setProducts((prev) =>
            prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
          );
          showToast("Produto atualizado com sucesso!", "success");
          closeForm();
        }
      } else {
        // Criar novo produto
        const response = await fetch(`/api/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });

        if (!response.ok) throw new Error("Failed to create product");
        const newProduct = await response.json();

        // Verificar se o código de barras foi definido
        if (newProduct.barcode) {
          setConfirmMessage(
            `Atenção: O código de barras do produto será definido como ${newProduct.barcode}.`
          );
          setPendingAction(() => () => {
            setProducts((prev) => [...prev, newProduct]);
            showToast("Produto cadastrado com sucesso!", "success");
          });
          setIsConfirmOpen(true);
        } else {
          setProducts((prev) => [...prev, newProduct]);
          showToast("Produto cadastrado com sucesso!", "success");
          closeForm();
        }
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to save product",
        "error"
      );
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const response = await fetch(`/api/products?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete product");
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete product");
    }
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return "Sem categoria";
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : "Categoria não encontrada";
  };

  const getStatusInfo = (active: boolean) => {
    return active
      ? {
          label: "Ativo",
          color: "bg-green-100 text-green-700 border-green-200",
        }
      : { label: "Inativo", color: "bg-red-100 text-red-700 border-red-200" };
  };

  const getTypeInfo = (type: Product["productType"]) => {
    return type === "sellable"
      ? {
          label: "Vendável",
          color: "bg-blue-100 text-blue-700 border-blue-200",
          icon: Package,
        }
      : {
          label: "Adicional",
          color: "bg-orange-100 text-orange-700 border-orange-200",
          icon: Plus,
        };
  };

  const handleConfirmAction = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setIsConfirmOpen(false);
    closeForm();
  };

  // Funções para formatação de preço
  const formatPriceToReais = (cents: number): string => {
    if (!cents || isNaN(cents) || cents <= 0) return "R$ 0,00";
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gerenciamento de Produtos
          </h1>
          <p className="text-gray-600">
            Cadastre e gerencie o catálogo de produtos
          </p>
        </div>
        <Button
          onClick={() => openForm()}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total</p>
                <p className="text-3xl font-bold text-blue-900">
                  {products.length}
                </p>
              </div>
              <Package className="h-12 w-12 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Vendáveis</p>
                <p className="text-3xl font-bold text-green-900">
                  {products.filter((p) => p.productType === "sellable").length}
                </p>
              </div>
              <Package className="h-12 w-12 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">
                  Adicionais
                </p>
                <p className="text-3xl font-bold text-orange-900">
                  {products.filter((p) => p.productType === "addon").length}
                </p>
              </div>
              <Plus className="h-12 w-12 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Ativos</p>
                <p className="text-3xl font-bold text-purple-900">
                  {products.filter((p) => p.active).length}
                </p>
              </div>
              <Check className="h-12 w-12 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">
                  Valor Total
                </p>
                <p className="text-3xl font-bold text-emerald-900">
                  R${" "}
                  {(
                    products.reduce((sum, p) => sum + p.priceCents, 0) / 100
                  ).toLocaleString("pt-BR")}
                </p>
              </div>
              <DollarSign className="h-12 w-12 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Busca e Filtros Compacta */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 shadow-sm">
        {/* Busca Principal */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 text-sm border-gray-200 bg-white/80 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
          />
          {searchTerm && (
            <Badge className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5">
              {products.length}
            </Badge>
          )}
        </div>

        {/* Filtros e Ações */}
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white/80 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-100 focus:border-blue-400"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as "all" | "sellable" | "addon")
            }
            className="px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white/80 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-100 focus:border-blue-400"
          >
            <option value="all">Todos os Tipos</option>
            <option value="sellable">Vendáveis</option>
            <option value="addon">Adicionais</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "active" | "inactive")
            }
            className="px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white/80 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-100 focus:border-blue-400"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setCategoryFilter("all");
              setStatusFilter("all");
              setTypeFilter("all");
            }}
            className="h-8 px-3 text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Limpar
          </Button>
        </div>
      </div>

      {/* Tabela de Produtos */}
      <Card className="bg-white/80 backdrop-blur-sm border-white/30 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Catálogo de Produtos
          </CardTitle>
          <CardDescription>
            {products.length} produto{products.length !== 1 ? "s" : ""}{" "}
            encontrado{products.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-4 text-gray-600">Carregando produtos...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Erro ao carregar produtos
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button
                onClick={loadProducts}
                className="bg-primary hover:bg-primary/90"
              >
                Tentar novamente
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Produto
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Categoria
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Tipo
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Preço
                    </th>
                    
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Estoque
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Código de Barras
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {product.name}
                            </div>
                            {product.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {product.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-700">
                          {getCategoryName(product.categoryId)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {(() => {
                          const typeInfo = getTypeInfo(product.productType);
                          const Icon = typeInfo.icon;
                          return (
                            <Badge
                              className={`${typeInfo.color} border px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit`}
                            >
                              <Icon className="h-3 w-3" />
                              {typeInfo.label}
                            </Badge>
                          );
                        })()}
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-lg font-semibold text-gray-900">
                          {formatPriceToReais(product.priceCents || 0)}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-700">
                          {product.stockEnabled ? (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span>
                                {product.stock !== undefined
                                  ? product.stock
                                  : 0}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              <span className="text-gray-500">
                                Sem controle
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {(() => {
                          const statusInfo = getStatusInfo(product.active);
                          return (
                            <Badge
                              className={`${statusInfo.color} border px-3 py-1 rounded-full text-xs font-medium`}
                            >
                              {statusInfo.label}
                            </Badge>
                          );
                        })()}
                      </td>
                      <td className="py-4 px-4">
                        {product.barcode ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadBarcode(product)}
                            className="flex items-center gap-2"
                          >
                            <BarcodeIcon className="h-4 w-4" />
                            Download
                          </Button>
                        ) : (
                          <span className="text-gray-500 text-sm">Sem código</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <ProductActionsMenu
                          onEdit={() => openForm(product)}
                          onDelete={() => setDeleteConfirm(product.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {products.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum produto encontrado
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm ||
                    categoryFilter !== "all" ||
                    statusFilter !== "all" ||
                    typeFilter !== "all"
                      ? "Tente ajustar os filtros de busca"
                      : "Comece cadastrando o primeiro produto do catálogo"}
                  </p>
                  {!searchTerm &&
                    categoryFilter === "all" &&
                    statusFilter === "all" &&
                    typeFilter === "all" && (
                      <Button
                        onClick={() => openForm()}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Cadastrar Produto
                      </Button>
                    )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Formulário */}
      <ProductFormDialog
        open={isFormOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        isUploading={isUploading}
        categories={categories}
        editingProduct={editingProduct}
        handleFileUpload={handleFileUpload}
        formatPriceToReais={formatPriceToReais}
      />

      {/* Modal de Confirmação de Exclusão */}
      <DeleteProductDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) deleteProduct(deleteConfirm);
        }}
      />

      {/* Diálogo de Confirmação */}
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Aviso Importante"
        description={confirmMessage}
        onConfirm={handleConfirmAction}
        confirmText="Continuar"
        cancelText="Cancelar"
      />
    </div>
  );
}
