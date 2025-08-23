"use client";

import {
  AlertCircle,
  Check,
  DollarSign,
  Edit,
  Image as ImageIcon,
  Package,
  Plus,
  Search,
  Trash2,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";

type Product = {
  id: string;
  name: string;
  barcode?: string;
  category_id?: string;
  price_cents: number;
  active: boolean;
  created_at: string;
  description?: string;
  stock_enabled: boolean;
  stock?: number;
  image_url?: string;
  product_type: "sellable" | "addon";
  variable_product: boolean;
};

type Category = {
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
    price_cents: "",
    description: "",
    stock_enabled: false,
    stock: "",
    active: true,
    image_url: "",
    product_type: "sellable" as Product["product_type"],
    variable_product: false
  });
  const [isUploading, setIsUploading] = useState(false);

  // Estados de alerta
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Função para lidar com o upload de arquivos
  const handleFileUpload = async (file: File) => {
    console.log('Iniciando upload do arquivo:', file.name);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      console.log('FormData criado');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      console.log('Resposta do servidor:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Erro na resposta:', errorData);
        throw new Error(errorData.error || 'Falha no upload');
      }

      const { url } = await response.json();
      console.log('URL recebida:', url);
      setFormData(prev => ({ ...prev, image_url: url }));
    } catch (error) {
      console.error('Erro no upload:', error);
      alert(error instanceof Error ? error.message : 'Falha no upload da imagem');
    } finally {
      setIsUploading(false);
    }
  };

  // Estados de filtros e busca
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "sellable" | "addon">("all");
  const [variableFilter, setVariableFilter] = useState<"all" | "variable" | "standard">("all");

  // Estados de confirmação
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Carregar produtos e categorias
  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/products?q=${searchTerm}&category=${categoryFilter}&status=${statusFilter}&type=${typeFilter}&variable=${variableFilter}`
      );
      if (!response.ok) throw new Error('Failed to fetch products');
      const result = await response.json();
      setProducts(result.data);
      setCategories(result.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Carregar produtos na montagem e quando filtros mudarem
  useEffect(() => {
    loadProducts();
  }, [searchTerm, categoryFilter, statusFilter, typeFilter, variableFilter]);

  // Funções auxiliares
  const resetForm = () => {
    setFormData({
      name: "",
      barcode: "",
      category_id: "",
      price_cents: "",
      description: "",
      stock_enabled: false,
      stock: "",
      active: true,
      image_url: "",
      product_type: "sellable",
      variable_product: false
    });
  };

  const openForm = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        barcode: product.barcode || "",
        category_id: product.category_id || "",
        price_cents: product.price_cents.toString(),
        description: product.description || "",
        stock_enabled: product.stock_enabled,
        stock: product.stock?.toString() || "",
        variable_product: product.variable_product,
        active: product.active,
        image_url: product.image_url || "",
        product_type: product.product_type
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
    
    // Validação do preço
    const priceCents = parseInt(formData.price_cents);
    if (!formData.price_cents || isNaN(priceCents) || priceCents <= 0) {
      alert('Por favor, insira um preço válido maior que zero.');
      return;
    }
    
    try {
      const productData = {
        name: formData.name,
        barcode: formData.barcode || undefined,
        category_id: formData.category_id || undefined,
        price_cents: parseInt(formData.price_cents),
        description: formData.description || undefined,
        stock_enabled: formData.stock_enabled,
        stock: formData.stock_enabled && formData.stock ? parseInt(formData.stock) : undefined,
        active: formData.active,
        image_url: formData.image_url || undefined,
        product_type: formData.product_type,
        variable_product: formData.variable_product
      };
      
      if (editingProduct) {
        // Editar produto existente
        const response = await fetch(`/api/products`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingProduct.id, ...productData })
        });
        
        if (!response.ok) throw new Error('Failed to update product');
        const updatedProduct = await response.json();
        
        // Verificar se o código de barras foi alterado
        if (editingProduct.barcode !== updatedProduct.barcode && updatedProduct.barcode) {
          setConfirmMessage(`Atenção: O código de barras do produto será alterado para ${updatedProduct.barcode}. Certifique-se de atualizar qualquer etiqueta física associada.`);
          setPendingAction(() => () => {
            setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
            showToast("Produto atualizado com sucesso!", "success");
          });
          setIsConfirmOpen(true);
        } else {
          setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
          showToast("Produto atualizado com sucesso!", "success");
          closeForm();
        }
      } else {
        // Criar novo produto
        const response = await fetch(`/api/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        });
        
        if (!response.ok) throw new Error('Failed to create product');
        const newProduct = await response.json();
        
        // Verificar se o código de barras foi definido
        if (newProduct.barcode) {
          setConfirmMessage(`Atenção: O código de barras do produto será definido como ${newProduct.barcode}.`);
          setPendingAction(() => () => {
            setProducts(prev => [...prev, newProduct]);
            showToast("Produto cadastrado com sucesso!", "success");
          });
          setIsConfirmOpen(true);
        } else {
          setProducts(prev => [...prev, newProduct]);
          showToast("Produto cadastrado com sucesso!", "success");
          closeForm();
        }
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save product', "error");
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const response = await fetch(`/api/products?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete product');
      setProducts(prev => prev.filter(p => p.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return "Sem categoria";
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : "Categoria não encontrada";
  };

  const getStatusInfo = (active: boolean) => {
    return active 
      ? { label: "Ativo", color: "bg-green-100 text-green-700 border-green-200" }
      : { label: "Inativo", color: "bg-red-100 text-red-700 border-red-200" };
  };

  const getTypeInfo = (type: Product["product_type"]) => {
    return type === "sellable"
      ? { label: "Vendável", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Package }
      : { label: "Adicional", color: "bg-orange-100 text-orange-700 border-orange-200", icon: Plus };
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
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    });
  };

  const formatReaisToCents = (reais: string): number => {
    // Remove todos os caracteres não numéricos exceto vírgula e ponto
    const cleanValue = reais.replace(/[^\d,.-]/g, '');
    
    // Se não há valor numérico, retorna 0
    if (!cleanValue) return 0;
    
    // Substitui vírgula por ponto para conversão
    const numericValue = parseFloat(cleanValue.replace(',', '.'));
    
    // Se não é um número válido, retorna 0
    if (isNaN(numericValue)) return 0;
    
    // Converte para centavos
    return Math.round(numericValue * 100);
  };

  const handlePriceChange = (value: string) => {
    // Remove tudo exceto números, vírgula e ponto
    const cleanValue = value.replace(/[^\d,.-]/g, '');
    
    // Se não há valor, limpa o campo
    if (!cleanValue) {
      setFormData(prev => ({ ...prev, price_cents: "" }));
      return;
    }

    // Converte para centavos e atualiza o estado
    const cents = formatReaisToCents(cleanValue);
    if (cents >= 0) {
      setFormData(prev => ({ ...prev, price_cents: cents.toString() }));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Produtos</h1>
          <p className="text-gray-600">Cadastre e gerencie o catálogo de produtos</p>
        </div>
        <Button onClick={() => openForm()} className="bg-primary hover:bg-primary/90">
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
                <p className="text-3xl font-bold text-blue-900">{products.length}</p>
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
                  {products.filter(p => p.product_type === "sellable").length}
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
                <p className="text-sm font-medium text-orange-600">Adicionais</p>
                <p className="text-3xl font-bold text-orange-900">
                  {products.filter(p => p.product_type === "addon").length}
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
                  {products.filter(p => p.active).length}
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
                <p className="text-sm font-medium text-emerald-600">Valor Total</p>
                <p className="text-3xl font-bold text-emerald-900">
                  R$ {(products.reduce((sum, p) => sum + p.price_cents, 0) / 100).toLocaleString('pt-BR')}
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
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | "sellable" | "addon")}
            className="px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white/80 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-100 focus:border-blue-400"
          >
            <option value="all">Todos os Tipos</option>
            <option value="sellable">Vendáveis</option>
            <option value="addon">Adicionais</option>
          </select>

          <select
            value={variableFilter}
            onChange={(e) => setVariableFilter(e.target.value as "all" | "variable" | "standard")}
            className="px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white/80 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-100 focus:border-blue-400"
          >
            <option value="all">Todas as Variações</option>
            <option value="variable">Com Variações</option>
            <option value="standard">Padrão</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
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
              setVariableFilter("all");
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
          <CardTitle className="text-xl font-semibold text-gray-900">Catálogo de Produtos</CardTitle>
          <CardDescription>
            {products.length} produto{products.length !== 1 ? 's' : ''} encontrado{products.length !== 1 ? 's' : ''}
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar produtos</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={loadProducts} className="bg-primary hover:bg-primary/90">
                Tentar novamente
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Produto</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Categoria</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Tipo</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Preço</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Variações</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Estoque</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{product.name}</div>
                            {product.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {product.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-700">{getCategoryName(product.category_id)}</div>
                      </td>
                      <td className="py-4 px-4">
                        {(() => {
                          const typeInfo = getTypeInfo(product.product_type);
                          const Icon = typeInfo.icon;
                          return (
                            <Badge className={`${typeInfo.color} border px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit`}>
                              <Icon className="h-3 w-3" />
                              {typeInfo.label}
                            </Badge>
                          );
                        })()}
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-lg font-semibold text-gray-900">
                          {formatPriceToReais(product.price_cents || 0)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-700">
                          {product.variable_product ? (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200 border px-3 py-1 rounded-full text-xs font-medium">
                              Com variações
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600 border-gray-200 border px-3 py-1 rounded-full text-xs font-medium">
                              Padrão
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-700">
                          {product.stock_enabled ? (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span>{product.stock !== undefined ? product.stock : 0}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              <span className="text-gray-500">Sem controle</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {(() => {
                          const statusInfo = getStatusInfo(product.active);
                          return (
                            <Badge className={`${statusInfo.color} border px-3 py-1 rounded-full text-xs font-medium`}>
                              {statusInfo.label}
                            </Badge>
                          );
                        })()}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openForm(product)}
                            className="h-8 px-3 rounded-lg border-gray-200 hover:bg-gray-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteConfirm(product.id)}
                            className="h-8 px-3 rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {products.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || categoryFilter !== "all" || statusFilter !== "all" || typeFilter !== "all" || variableFilter !== "all"
                      ? "Tente ajustar os filtros de busca" 
                      : "Comece cadastrando o primeiro produto do catálogo"
                    }
                  </p>
                  {!searchTerm && categoryFilter === "all" && statusFilter === "all" && typeFilter === "all" && variableFilter === "all" && (
                    <Button onClick={() => openForm()} className="bg-primary hover:bg-primary/90">
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
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl border-0">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold">
                    {editingProduct ? "Editar Produto" : "Novo Produto"}
                  </CardTitle>
                  <CardDescription>
                    {editingProduct ? "Atualize as informações do produto" : "Preencha os dados para cadastrar um novo produto"}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeForm}
                  className="h-8 w-8 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Nome do Produto *</label>
                    <Input
                      placeholder="Digite o nome do produto"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Código de Barras</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="7891234567890"
                        value={formData.barcode}
                        onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                        className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          // Gerar código de barras no range 5-7 (iniciando com 5, 6 ou 7)
                          const prefix = Math.floor(Math.random() * 3) + 5; // 5, 6 ou 7
                          const randomSuffix = Math.floor(Math.random() * 1000000000000);
                          const randomBarcode = prefix * 1000000000000 + randomSuffix;
                          setFormData(prev => ({ ...prev, barcode: randomBarcode.toString() }));
                        }}
                        className="px-3 py-2 border-gray-200 hover:bg-gray-50 text-xs"
                        title="Gerar código de barras aleatório"
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Categoria</label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:ring-primary/20 focus:outline-none"
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Preço *</label>
                    <Input
                      type="text"
                      placeholder="R$ 25,00"
                      value={formData.price_cents && formData.price_cents !== "" && !isNaN(parseInt(formData.price_cents)) && parseInt(formData.price_cents) > 0 ? formatPriceToReais(parseInt(formData.price_cents)) : ""}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Controle de Estoque</label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                          <input
                            type="checkbox"
                            checked={formData.stock_enabled}
                            onChange={(e) => setFormData(prev => ({ ...prev, stock_enabled: e.target.checked }))}
                            className="peer h-6 w-11 rounded-full border-2 border-gray-300 bg-gray-200 transition-colors checked:border-primary checked:bg-primary focus:outline-none focus:ring-0"
                          />
                          <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"></span>
                        </div>
                        <span className="text-sm text-gray-700">Ativar controle de estoque</span>
                      </label>
                    </div>
                    {formData.stock_enabled && (
                      <div className="mt-2">
                        <Input
                          type="number"
                          placeholder="50"
                          value={formData.stock}
                          onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                          className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Tipo de Produto *</label>
                    <select
                      value={formData.product_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, product_type: e.target.value as Product["product_type"] }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:ring-primary/20 focus:outline-none"
                      required
                    >
                      <option value="sellable">Produto Vendável</option>
                      <option value="addon">Adicional/Complemento</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Produto Variável</label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                          <input
                            type="checkbox"
                            checked={formData.variable_product}
                            onChange={(e) => setFormData(prev => ({ ...prev, variable_product: e.target.checked }))}
                            className="peer h-6 w-11 rounded-full border-2 border-gray-300 bg-gray-200 transition-colors checked:border-primary checked:bg-primary focus:outline-none focus:ring-0"
                          />
                          <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"></span>
                        </div>
                        <span className="text-sm text-gray-700">Produto com variações (tamanhos, cores, etc.)</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Imagem do Produto</label>
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
                        <div className="text-sm text-muted-foreground">Enviando imagem...</div>
                      )}
                      {formData.image_url && (
                        <div className="mt-2">
                          <img 
                            src={formData.image_url} 
                            alt="Preview" 
                            className="h-20 w-20 rounded-md object-cover"
                          />
                        </div>
                      )}
                      <Input
                        placeholder="ou insira uma URL diretamente"
                        value={formData.image_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                        className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Descrição</label>
                  <Input
                    placeholder="Descrição detalhada do produto"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                        className="peer h-6 w-11 rounded-full border-2 border-gray-300 bg-gray-200 transition-colors checked:border-primary checked:bg-primary focus:outline-none focus:ring-0"
                      />
                      <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"></span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Produto ativo</span>
                  </label>
                </div>

                {/* Separator */}
                <div className="border-t border-gray-200 my-6"></div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeForm}
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
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white shadow-2xl border-0">
            <CardHeader className="text-center border-b border-gray-200">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-lg font-semibold text-gray-900">Confirmar Exclusão</CardTitle>
              <CardDescription>
                Tem certeza que deseja remover este produto? Esta ação não pode ser desfeita.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-6 py-2 rounded-lg border-gray-200 hover:bg-gray-50"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => deleteProduct(deleteConfirm)}
                  className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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