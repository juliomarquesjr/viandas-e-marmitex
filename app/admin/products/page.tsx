"use client";

import * as React from "react";
import { useToast } from "../../components/Toast";
import { DeleteConfirmDialog } from "../../components/DeleteConfirmDialog";
import { ProductFormDialog } from "./components/ProductFormDialog";
import { PageHeader } from "../components/layout";
import { DataTable, Column } from "../components/data-display";
import { SkeletonTable } from "../components/data-display";
import { Button } from "../../components/ui/button";
import { Badge, StatusBadge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import {
  Package,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Barcode,
  DollarSign,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Shapes,
} from "lucide-react";
import { ProductStatsCards } from "./components/ProductStatsCards";
import { ProductPageSkeleton } from "./components/ProductSkeletonLoader";
import { ProductGridView } from "./components/ProductGridView";
import { ProductPreviewModal } from "./components/ProductPreviewModal";
import { ProductFilterBar } from "./components/ProductFilterBar";
import { ManageCategoriesDialog } from "./components/ManageCategoriesDialog";
import { DynamicCategoryIcon } from "./components/CategoryIconPicker";

// =============================================================================
// TIPOS
// =============================================================================

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
  icon?: string | null;
};

// =============================================================================
// MENU DE AÇÕES
// =============================================================================

function ProductActionsMenu({
  product,
  onEdit,
  onDelete,
  onDownloadBarcode,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onDownloadBarcode: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Ações">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={4}
        collisionPadding={12}
        className="w-max max-w-[min(100vw-1.5rem,20rem)] p-1 bg-white text-slate-700 border-slate-200 shadow-lg"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {product.barcode && (
          <button
            type="button"
            className="flex items-center w-full whitespace-nowrap px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-sm"
            onClick={() => {
              setOpen(false);
              onDownloadBarcode();
            }}
          >
            <Barcode className="h-4 w-4 mr-2 shrink-0 text-slate-400" />
            Etiqueta
          </button>
        )}
        <button
          type="button"
          className="flex items-center w-full whitespace-nowrap px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-sm"
          onClick={() => {
            setOpen(false);
            onEdit();
          }}
        >
          <Edit className="h-4 w-4 mr-2 shrink-0 text-slate-400" />
          Editar
        </button>
        <button
          type="button"
          className="flex items-center w-full whitespace-nowrap px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-sm"
          onClick={() => {
            setOpen(false);
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4 mr-2 shrink-0" />
          Remover
        </button>
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function AdminProductsPage() {
  const { showToast } = useToast();
  const pageSizeOptions = React.useMemo(() => [10, 25, 50, 100], []);

  // Estados de dados
  const [products, setProducts] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Estados de busca e filtros
  const [searchInput, setSearchInput] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = React.useState<"all" | "sellable" | "addon">("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");

  // Estados de paginação
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(() => {
    if (typeof window === "undefined") return 10;
    const defaultPageSize = pageSizeOptions[0];
    const savedValue = Number(sessionStorage.getItem("products-items-per-page"));
    if (Number.isNaN(savedValue)) return defaultPageSize;
    return pageSizeOptions.includes(savedValue) ? savedValue : defaultPageSize;
  });

  // Estado de modo de exibição (persistido na sessão)
  const [viewMode, setViewMode] = React.useState<"table" | "grid">(() => {
    if (typeof window === "undefined") return "table";
    return (sessionStorage.getItem("products-view-mode") as "table" | "grid") ?? "table";
  });

  const handleViewModeChange = (mode: "table" | "grid") => {
    setViewMode(mode);
    sessionStorage.setItem("products-view-mode", mode);
  };

  const handleItemsPerPageChange = React.useCallback(
    (size: number) => {
      const defaultPageSize = pageSizeOptions[0];
      const normalizedSize = pageSizeOptions.includes(size) ? size : defaultPageSize;
      setItemsPerPage(normalizedSize);
      setCurrentPage(1);
      sessionStorage.setItem("products-items-per-page", String(normalizedSize));
    },
    [pageSizeOptions]
  );

  // Estados do formulário
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [formData, setFormData] = React.useState({
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

  // Estados de confirmação
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = React.useState(false);

  // Estado do preview
  const [previewProduct, setPreviewProduct] = React.useState<Product | null>(null);

  // Estado do modal de categorias
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = React.useState(false);

  // Debounce da busca
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Carregar produtos e categorias
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);

      // Carregar produtos
      const productsResponse = await fetch("/api/products", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!productsResponse.ok) throw new Error("Falha ao carregar produtos");
      const productsResult = await productsResponse.json();
      setProducts(productsResult.data || []);

      // Carregar categorias
      const categoriesResponse = await fetch("/api/categories");
      if (categoriesResponse.ok) {
        const categoriesResult = await categoriesResponse.json();
        setCategories(categoriesResult.data || []);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar produtos";
      setError(msg);
      showToast(msg, "error", "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCategoriesChanged = React.useCallback(async () => {
    const res = await fetch("/api/categories");
    if (res.ok) {
      const result = await res.json();
      setCategories(result.data || []);
    }
  }, []);

  const handleCategoryAdded = React.useCallback((newCategory: Category) => {
    setCategories((prev) =>
      [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name))
    );
  }, []);

  // Funções do formulário
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

  const openForm = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        barcode: product.barcode || "",
        category_id: product.categoryId || "",
        // Inteiros em centavos (string), igual ao que o ProductFormDialog grava — evita parseInt("12.50") === 12
        priceCents: String(product.priceCents),
        pricePerKgCents:
          product.pricePerKgCents != null && product.pricePerKgCents > 0
            ? String(product.pricePerKgCents)
            : "",
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

  const handleFormSubmit = async (e: React.FormEvent, formData: any, finalImageUrl?: string) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast("Por favor, informe o nome do produto.", "error");
      return;
    }

    try {
      const priceCents = parseInt(String(formData.priceCents || "0"), 10);
      const pricePerKgParsed = parseInt(String(formData.pricePerKgCents || "0"), 10);
      
      // Usa a finalImageUrl se fornecida (do upload), caso contrário usa a URL do formData
      const imageUrlToSave = finalImageUrl || formData.imageUrl;
      
      const productData = {
        name: formData.name,
        barcode: formData.barcode || undefined,
        categoryId: formData.category_id || undefined,
        priceCents: Number.isNaN(priceCents) ? 0 : priceCents,
        pricePerKgCents:
          formData.pricePerKgCents != null &&
          String(formData.pricePerKgCents).trim() !== "" &&
          !Number.isNaN(pricePerKgParsed) &&
          pricePerKgParsed > 0
            ? pricePerKgParsed
            : undefined,
        description: formData.description || undefined,
        stockEnabled: formData.stockEnabled,
        stock: formData.stockEnabled ? parseInt(formData.stock || "0") : undefined,
        active: formData.active,
        imageUrl: imageUrlToSave || undefined,
        productType: formData.productType,
      };

      if (editingProduct) {
        const response = await fetch("/api/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingProduct.id, ...productData }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Falha ao atualizar produto");
        }

        const updatedProduct = await response.json();
        setProducts((prev) =>
          prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
        );
        showToast("Produto atualizado com sucesso!", "success");
        closeForm();
      } else {
        const response = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Falha ao criar produto");
        }

        const newProduct = await response.json();
        setProducts((prev) => [...prev, newProduct]);
        showToast("Produto cadastrado com sucesso!", "success");
        closeForm();
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Falha ao salvar produto",
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
        const result = await response.json();
        throw new Error(result.error || "Falha ao excluir produto");
      }

      setProducts((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirm(null);
      showToast("Produto excluído com sucesso!", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Falha ao excluir produto",
        "error"
      );
    } finally {
      setIsDeletingProduct(false);
    }
  };

  const downloadBarcode = async (product: Product) => {
    if (!product.barcode) {
      showToast("Este produto não possui código de barras.", "error");
      return;
    }

    try {
      const barcodeUrl = `https://barcodeapi.org/api/code128/${product.barcode}`;
      const img = new Image();
      img.crossOrigin = "Anonymous";

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

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

      img.src = barcodeUrl;
    } catch (error) {
      showToast("Erro ao gerar código de barras.", "error");
    }
  };

  // Formatar preço
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  // Obter categoria completa (com ícone)
  const getCategory = React.useCallback(
    (categoryId?: string): Category | undefined => {
      if (!categoryId) return undefined;
      return categories.find((c) => c.id === categoryId);
    },
    [categories]
  );

  // Colunas da tabela
  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Produto",
      render: (_, product) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Package className="h-5 w-5 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{product.name}</p>
            <p className="text-xs text-slate-500">
              {product.barcode || "Sem código"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Categoria",
      render: (_, product) => {
        const cat = getCategory(product.categoryId);
        if (!cat) {
          return <span className="text-sm text-slate-400">Sem categoria</span>;
        }
        return (
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 shrink-0">
              {cat.icon ? (
                <DynamicCategoryIcon name={cat.icon} className="h-3 w-3 text-primary" />
              ) : (
                <Shapes className="h-3 w-3 text-primary" />
              )}
            </span>
            <span className="text-sm text-slate-700">{cat.name}</span>
          </div>
        );
      },
    },
    {
      key: "price",
      header: "Preço",
      render: (_, product) => (
        <div className="text-left">
          <p className="font-medium text-slate-900">
            {formatPrice(product.priceCents)}
          </p>
          {product.pricePerKgCents && (
            <p className="text-xs text-slate-500">
              {formatPrice(product.pricePerKgCents)}/kg
            </p>
          )}
        </div>
      ),
    },
    {
      key: "stock",
      header: "Estoque",
      render: (_, product) => {
        if (!product.stockEnabled) {
          return <span className="text-slate-400 text-sm">N/A</span>;
        }
        const stock = product.stock ?? 0;
        const stockColor =
          stock <= 0 ? "text-red-600" : stock < 10 ? "text-amber-600" : "text-emerald-600";
        return (
          <span className={`font-medium ${stockColor}`}>
            {stock}
          </span>
        );
      },
    },
    {
      key: "type",
      header: "Tipo",
      render: (_, product) => (
        <Badge variant={product.productType === "sellable" ? "primary" : "default"} size="sm">
          {product.productType === "sellable" ? "Venda" : "Adicional"}
        </Badge>
      ),
    },
    {
      key: "active",
      header: "Status",
      render: (_, product) => (
        <StatusBadge status={product.active ? "active" : "inactive"} size="sm" />
      ),
    },
  ];

  // Filtrar produtos
  const filteredProducts = React.useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        !searchTerm ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.includes(searchTerm);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && product.active) ||
        (statusFilter === "inactive" && !product.active);
      const matchesType =
        typeFilter === "all" || product.productType === typeFilter;
      const matchesCategory =
        categoryFilter === "all" ||
        (categoryFilter === "none" && !product.categoryId) ||
        product.categoryId === categoryFilter;
      return matchesSearch && matchesStatus && matchesType && matchesCategory;
    });
  }, [products, searchTerm, statusFilter, typeFilter, categoryFilter]);

  const totalFilteredPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / itemsPerPage) || 1
  );

  const paginatedProducts = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  React.useEffect(() => {
    if (currentPage > totalFilteredPages) {
      setCurrentPage(totalFilteredPages);
    }
  }, [currentPage, totalFilteredPages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Produtos"
        description="Gerencie os produtos do estabelecimento"
        icon={Package}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsManageCategoriesOpen(true)}>
              <Shapes className="h-4 w-4 mr-1.5" />
              Categorias
            </Button>
            <Button size="sm" onClick={() => openForm()}>
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Produto
            </Button>
          </div>
        }
      />

      {loading && products.length === 0 ? (
        <ProductPageSkeleton />
      ) : (
        <>
          {/* Estatísticas */}
          <ProductStatsCards products={products} />

          {/* Filtros */}
          <ProductFilterBar
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            typeFilter={typeFilter}
            onTypeChange={setTypeFilter}
            categories={categories}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            totalCount={products.length}
            filteredCount={filteredProducts.length}
          />

          {/* Tabela / Mosaico */}
          {error ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={loadData}>Tentar novamente</Button>
              </CardContent>
            </Card>
          ) : viewMode === "table" ? (
            <DataTable
              data={filteredProducts}
              columns={columns}
              rowKey="id"
              emptyMessage="Nenhum produto encontrado"
              onRowClick={(product) => setPreviewProduct(product)}
              rowActions={(product) => (
                <ProductActionsMenu
                  product={product}
                  onEdit={() => openForm(product)}
                  onDelete={() => setDeleteConfirm(product.id)}
                  onDownloadBarcode={() => downloadBarcode(product)}
                />
              )}
              pagination={{
                page: currentPage,
                pageSize: itemsPerPage,
                total: filteredProducts.length,
                onPageChange: setCurrentPage,
                onPageSizeChange: handleItemsPerPageChange,
              }}
            />
          ) : (
            <ProductGridView
              products={paginatedProducts}
              getCategory={getCategory}
              formatPrice={formatPrice}
              onEdit={openForm}
              onDelete={(id) => setDeleteConfirm(id)}
              onDownloadBarcode={downloadBarcode}
              onCardClick={(product) => setPreviewProduct(product)}
              pagination={{
                page: currentPage,
                pageSize: itemsPerPage,
                total: filteredProducts.length,
                onPageChange: setCurrentPage,
                onPageSizeChange: handleItemsPerPageChange,
              }}
              emptyMessage="Nenhum produto encontrado"
            />
          )}
        </>
      )}

      {/* Modal de Preview */}
      <ProductPreviewModal
        product={previewProduct}
        categories={categories}
        open={previewProduct !== null}
        onClose={() => setPreviewProduct(null)}
        onEdit={(product) => {
          setPreviewProduct(null);
          openForm(product);
        }}
        onDownloadBarcode={downloadBarcode}
      />

      {/* Dialog de Formulário */}
      <ProductFormDialog
        open={isFormOpen}
        onClose={closeForm}
        onSubmit={(e, finalImageUrl) => handleFormSubmit(e, formData, finalImageUrl)}
        formData={formData}
        setFormData={setFormData}
        isUploading={false}
        categories={categories}
        editingProduct={editingProduct}
        formatPriceToReais={(cents) => formatPrice(cents)}
        onCategoryAdded={handleCategoryAdded}
      />

      {/* Modal de Gerenciamento de Categorias */}
      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        onChanged={handleCategoriesChanged}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <DeleteConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Excluir Produto"
        description="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
        onConfirm={() => deleteConfirm && deleteProduct(deleteConfirm)}
        isLoading={isDeletingProduct}
      />
    </div>
  );
}
