"use client";

import { motion } from "framer-motion";
import {
  Barcode as BarcodeIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Edit,
  Image as ImageIcon,
  MoreVertical,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { DeleteProductDialog } from "../../components/DeleteProductDialog";
import { ProductFormDialog } from "../../components/ProductFormDialog";
import { useToast } from "../../components/Toast";
import { AnimatedCard } from "../../components/ui/animated-card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
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
  onDownload,
  hasBarcode,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onDownload: () => void;
  hasBarcode: boolean;
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
        <MoreVertical className="h-5 w-5 text-muted-foreground" />
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-36 bg-background border border-border rounded-lg shadow-lg py-1 animate-fade-in">
          {hasBarcode && (
            <button
              className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent"
              onClick={() => {
                setOpen(false);
                onDownload();
              }}
            >
              <BarcodeIcon className="h-4 w-4 mr-2 text-blue-500" />
              Etiqueta
            </button>
          )}
          <button
            className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent"
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
  pricePerKgCents?: number;
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
    pricePerKgCents: "",
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
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      
      // Include old image URL for deletion if it exists
      if (formData.imageUrl) {
        uploadFormData.append("oldImageUrl", formData.imageUrl);
      }
      
      console.log("FormData criado");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
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

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const itemsPerPageOptions = [5, 10, 20, 50];

  // Estados de confirmação
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

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
    // Resetar para a primeira página quando filtros mudarem
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter, typeFilter]);

  // Resetar para a primeira página quando mudar itens por página
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Funções auxiliares
  const resetForm = () => {
    setFormData({
      name: "",
      barcode: "",
      category_id: "",
      priceCents: "",
      pricePerKgCents: "",
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
            a.download = `barcode-${product.name.replace(/\s+/g, "-")}-${
              product.barcode
            }.png`;
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
        priceCents: product.priceCents?.toString() || "",
        pricePerKgCents: product.pricePerKgCents?.toString() || "",
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
    let pricePerKgCents: number | undefined = undefined;
    
    if (formData.priceCents) {
      priceCents = parseInt(formData.priceCents);
    }
    
    if (formData.pricePerKgCents) {
      pricePerKgCents = parseInt(formData.pricePerKgCents);
    }

    // Validação: deve ter priceCents OU pricePerKgCents, mas não ambos
    const hasPriceCents = !isNaN(priceCents) && priceCents > 0;
    const hasPricePerKgCents = pricePerKgCents !== undefined && !isNaN(pricePerKgCents) && pricePerKgCents > 0;

    if (hasPriceCents && hasPricePerKgCents) {
      alert("O produto não pode ter preço unitário e preço por quilo simultaneamente.");
      return;
    }

    if (!hasPriceCents && !hasPricePerKgCents) {
      alert("Por favor, insira um preço válido (unitário ou por quilo) maior que zero.");
      return;
    }

    try {
      const productData: any = {
        name: formData.name,
        barcode: formData.barcode || undefined,
        categoryId: formData.category_id || undefined,
        priceCents: hasPriceCents ? priceCents : 0,
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

      // Adicionar pricePerKgCents apenas se for preço por quilo
      if (hasPricePerKgCents) {
        productData.pricePerKgCents = pricePerKgCents;
      }

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
    setIsDeletingProduct(true);
    try {
      const response = await fetch(`/api/products?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete product");
      }
      
      const result = await response.json();
      
      if (result.deactivated) {
        // Atualizar o produto para inativo em vez de removê-lo
        setProducts((prev) => 
          prev.map((p) => 
            p.id === id ? { ...p, active: false } : p
          )
        );
        showToast("Produto desativado com sucesso (possui vendas associadas)", "warning");
      } else {
        // Remover o produto da lista
        setProducts((prev) => prev.filter((p) => p.id !== id));
        showToast("Produto excluído com sucesso", "success");
      }
      
      setDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete product");
    } finally {
      setIsDeletingProduct(false);
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

  // Funções de paginação
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = products.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Gerenciamento de Produtos
          </h1>
          <p className="text-muted-foreground">Cadastre e gerencie o catálogo de produtos</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedCard delay={0.1}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">
                  Total de Produtos
                </p>
                <p className="text-3xl font-bold text-blue-900">
                  {products.length}
                </p>
              </div>
              <Package className="h-12 w-12 text-blue-600" />
            </div>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">
                  Produtos Vendáveis
                </p>
                <p className="text-3xl font-bold text-green-900">
                  {products.filter((p) => p.productType === "sellable").length}
                </p>
              </div>
              <Package className="h-12 w-12 text-green-600" />
            </div>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard delay={0.3}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">
                  Produtos Ativos
                </p>
                <p className="text-3xl font-bold text-amber-900">
                  {products.filter((p) => p.active).length}
                </p>
              </div>
              <Check className="h-12 w-12 text-amber-600" />
            </div>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard delay={0.4}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">
                  Valor Total
                </p>
                <p className="text-3xl font-bold text-purple-900">
                  {formatPriceToReais(products.reduce((sum, p) => sum + p.priceCents, 0))}
                </p>
              </div>
              <DollarSign className="h-12 w-12 text-purple-600" />
            </div>
          </CardContent>
        </AnimatedCard>
      </div>

      {/* Barra de Busca e Filtros */}
      <AnimatedCard>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Busca Principal */}
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 text-sm"
              />
              {searchTerm && (
                <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
                  {products.length}
                </Badge>
              )}
            </div>

            {/* Filtros e Ações */}
            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              {/* Seletor de itens por página */}
              <div className="relative">
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="appearance-none bg-background border border-input rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all w-full md:w-32"
                >
                  {itemsPerPageOptions.map((option) => (
                    <option key={option} value={option}>
                      {option} por página
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="appearance-none bg-background border border-input rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all w-full md:w-40"
                >
                  <option value="all">Todas as Categorias</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) =>
                    setTypeFilter(e.target.value as "all" | "sellable" | "addon")
                  }
                  className="appearance-none bg-background border border-input rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all w-full md:w-36"
                >
                  <option value="all">Todos os Tipos</option>
                  <option value="sellable">Vendáveis</option>
                  <option value="addon">Adicionais</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as "all" | "active" | "inactive")
                  }
                  className="appearance-none bg-background border border-input rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all w-full md:w-32"
                >
                  <option value="all">Todos os Status</option>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("all");
                  setStatusFilter("all");
                  setTypeFilter("all");
                }}
                className="h-9 px-3 text-sm"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Tabela de Produtos */}
      <AnimatedCard>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">
            Catálogo de Produtos
          </CardTitle>
          <CardDescription>
            {products.length} produto{products.length !== 1 ? "s" : ""} encontrado
            {products.length !== 1 ? "s" : ""} • Página {currentPage} de {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-4 text-muted-foreground">Carregando produtos...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Erro ao carregar produtos
              </h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button
                onClick={loadProducts}
                className="bg-primary hover:bg-primary/90"
              >
                Tentar novamente
              </Button>
            </div>
          ) : (
            <div className="w-full">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 font-semibold text-foreground">
                      Produto
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground">
                      Categoria
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground">
                      Tipo
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground">
                      Preço
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground">
                      Estoque
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground">
                      Status
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentProducts.map((product, index) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="border-b border-border hover:bg-accent/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              {product.name}
                            </div>
                            {product.description && (
                              <div className="text-sm text-muted-foreground truncate max-w-xs">
                                {product.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-sm text-foreground">
                          {getCategoryName(product.categoryId)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {(() => {
                          const typeInfo = getTypeInfo(product.productType);
                          const Icon = typeInfo.icon;
                          return (
                            <Badge
                              className={`${typeInfo.color} border px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 w-fit`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {typeInfo.label}
                            </Badge>
                          );
                        })()}
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-lg font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            {product.pricePerKgCents && product.pricePerKgCents > 0 ? (
                              <>
                                <span>{formatPriceToReais(product.pricePerKgCents)}</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  /kg
                                </span>
                              </>
                            ) : (
                              <span>{formatPriceToReais(product.priceCents || 0)}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-sm text-foreground">
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
                              <span className="text-muted-foreground">
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
                              className={`${statusInfo.color} border px-3 py-1.5 rounded-full text-xs font-medium`}
                            >
                              {statusInfo.label}
                            </Badge>
                          );
                        })()}
                      </td>

                      <td className="py-4 px-4">
                        <ProductActionsMenu
                          onEdit={() => openForm(product)}
                          onDelete={() => setDeleteConfirm(product.id)}
                          onDownload={() => downloadBarcode(product)}
                          hasBarcode={!!product.barcode}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>

              {currentProducts.length === 0 && products.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Nenhum produto encontrado
                  </h3>
                  <p className="text-muted-foreground mb-4">
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
      </AnimatedCard>

      {/* Componente de Paginação */}
      {products.length > 0 && totalPages > 1 && (
        <AnimatedCard>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Informações da paginação */}
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(endIndex, products.length)} de {products.length} produtos
              </div>

              {/* Navegação de páginas */}
              <div className="flex items-center gap-2">
                {/* Botão Anterior */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="h-9 w-9 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Números das páginas */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const pages = [];
                    const maxVisiblePages = 5;
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                    // Ajustar se estivermos no final
                    if (endPage - startPage + 1 < maxVisiblePages) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }

                    // Primeira página e reticências
                    if (startPage > 1) {
                      pages.push(
                        <Button
                          key={1}
                          variant={currentPage === 1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(1)}
                          className="h-9 w-9 p-0"
                        >
                          1
                        </Button>
                      );
                      if (startPage > 2) {
                        pages.push(
                          <span key="ellipsis1" className="px-2 text-muted-foreground">
                            ...
                          </span>
                        );
                      }
                    }

                    // Páginas do meio
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant={currentPage === i ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(i)}
                          className="h-9 w-9 p-0"
                        >
                          {i}
                        </Button>
                      );
                    }

                    // Última página e reticências
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(
                          <span key="ellipsis2" className="px-2 text-muted-foreground">
                            ...
                          </span>
                        );
                      }
                      pages.push(
                        <Button
                          key={totalPages}
                          variant={currentPage === totalPages ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(totalPages)}
                          className="h-9 w-9 p-0"
                        >
                          {totalPages}
                        </Button>
                      );
                    }

                    return pages;
                  })()}
                </div>

                {/* Botão Próximo */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="h-9 w-9 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </AnimatedCard>
      )}

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
        isLoading={isDeletingProduct}
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
