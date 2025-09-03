"use client";

import { motion } from "framer-motion";
import {
  Barcode as BarcodeIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit,
  MapPin,
  MoreVertical,
  Package,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
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

// Menu de opções por cliente
function CustomerActionsMenu({
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
        aria-label="Ações do cliente"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical className="h-5 w-5 text-muted-foreground" />
      </Button>
      {open && (
        <div 
          role="menu"
          className="absolute right-0 z-50 mt-2 w-36 bg-background border border-border rounded-lg shadow-lg py-1 animate-fade-in min-w-max sm:right-0 -right-4"
        >
          {hasBarcode && (
            <button
              role="menuitem"
              className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors duration-150"
              onClick={() => {
                setOpen(false);
                onDownload();
              }}
            >
              <BarcodeIcon className="h-4 w-4 mr-2 text-blue-500" />
              Código de Barras
            </button>
          )}
          <div className="border-t border-border my-1"></div>
          <button
            role="menuitem"
            className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors duration-150"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            <Edit className="h-4 w-4 mr-2 text-blue-500" /> Editar
          </button>
          <button
            role="menuitem"
            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
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

type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  doc?: string;
  barcode?: string;
  address?: any;
  active: boolean;
  createdAt: string;
};

export default function AdminCustomersPage() {
  const { showToast } = useToast();

  // Estados de dados
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados do formulário
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    doc: "",
    barcode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zip: "",
    active: true,
  });

  // Estados de alerta
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Estados de filtros e busca
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const itemsPerPageOptions = [5, 10, 20, 50];

  // Estados de confirmação
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Carregar clientes
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/customers?q=${searchTerm}&status=${statusFilter}`,
        {
          cache: 'no-store', // Força não usar cache
          headers: {
            'Cache-Control': 'no-cache'
          }
        }
      );
      if (!response.ok) throw new Error("Failed to fetch customers");
      const result = await response.json();
      setCustomers(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  // Carregar clientes na montagem e quando filtros mudarem
  useEffect(() => {
    loadCustomers();
    // Resetar para a primeira página quando filtros mudarem
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Resetar para a primeira página quando mudar itens por página
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Funções auxiliares
  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      doc: "",
      barcode: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zip: "",
      active: true,
    });
  };

  const openForm = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      const address = customer.address || {};
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || "",
        doc: customer.doc || "",
        barcode: customer.barcode || "",
        street: address.street || "",
        number: address.number || "",
        complement: address.complement || "",
        neighborhood: address.neighborhood || "",
        city: address.city || "",
        state: address.state || "",
        zip: address.zip || "",
        active: customer.active,
      });
    } else {
      setEditingCustomer(null);
      resetForm();
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCustomer(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação básica
    if (!formData.name.trim()) {
      alert("Por favor, informe o nome do cliente.");
      return;
    }

    if (!formData.phone.trim()) {
      alert("Por favor, informe o telefone do cliente.");
      return;
    }

    try {
      // Monta o objeto de endereço
      const address = {
        street: formData.street,
        number: formData.number,
        complement: formData.complement,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
      };

      const customerData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        doc: formData.doc || undefined,
        barcode: formData.barcode || undefined,
        address: Object.values(address).some((v) => v) ? address : undefined,
        active: formData.active,
      };

      if (editingCustomer) {
        // Editar cliente existente
        const response = await fetch(`/api/customers`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingCustomer.id, ...customerData }),
        });

        if (!response.ok) throw new Error("Failed to update customer");
        const updatedCustomer = await response.json();

        // Verificar se o código de barras foi alterado
        if (
          editingCustomer.barcode !== updatedCustomer.barcode &&
          updatedCustomer.barcode
        ) {
          setConfirmMessage(
            `Atenção: O código de barras do cliente será alterado para ${updatedCustomer.barcode}. Certifique-se de atualizar qualquer etiqueta física associada.`
          );
          setPendingAction(() => () => {
            setCustomers((prev) =>
              prev.map((c) =>
                c.id === updatedCustomer.id ? updatedCustomer : c
              )
            );
            showToast("Cliente atualizado com sucesso!", "success");
          });
          setIsConfirmOpen(true);
        } else {
          setCustomers((prev) =>
            prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c))
          );
          showToast("Cliente atualizado com sucesso!", "success");
          closeForm();
        }
      } else {
        // Criar novo cliente
        const response = await fetch(`/api/customers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(customerData),
        });

        if (!response.ok) throw new Error("Failed to create customer");
        const newCustomer = await response.json();

        // Verificar se o código de barras foi definido
        if (newCustomer.barcode) {
          setConfirmMessage(
            `Atenção: O código de barras do cliente será definido como ${newCustomer.barcode}.`
          );
          setPendingAction(() => () => {
            setCustomers((prev) => [...prev, newCustomer]);
            showToast("Cliente cadastrado com sucesso!", "success");
          });
          setIsConfirmOpen(true);
        } else {
          setCustomers((prev) => [...prev, newCustomer]);
          showToast("Cliente cadastrado com sucesso!", "success");
          closeForm();
        }
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to save customer",
        "error"
      );
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const response = await fetch(`/api/customers?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete customer");
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete customer");
    }
  };

  const getStatusInfo = (active: boolean) => {
    return active
      ? {
          label: "Ativo",
          color: "bg-green-100 text-green-700 border-green-200",
        }
      : { label: "Inativo", color: "bg-red-100 text-red-700 border-red-200" };
  };

  const handleConfirmAction = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setIsConfirmOpen(false);
    closeForm();
  };

  // Funções de paginação
  const totalPages = Math.ceil(customers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCustomers = customers.slice(startIndex, endIndex);

  
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

  // Função para gerar e baixar o código de barras
  const downloadBarcode = async (customer: Customer) => {
    if (!customer.barcode) {
      alert("Este cliente não possui um código de barras definido.");
      return;
    }

    try {
      // Usar uma API online para gerar o código de barras
      const barcodeUrl = `https://barcodeapi.org/api/code128/${customer.barcode}`;

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
            a.download = `barcode-${customer.name.replace(/\s+/g, "-")}-${
              customer.barcode
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

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Gerenciamento de Clientes
          </h1>
          <p className="text-muted-foreground">
            Cadastre e gerencie os clientes do estabelecimento
          </p>
        </div>
        <Button
          onClick={() => openForm()}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedCard delay={0.1}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">
                  Total de Clientes
                </p>
                <p className="text-3xl font-bold text-blue-900">
                  {customers.length}
                </p>
              </div>
              <User className="h-12 w-12 text-blue-600" />
            </div>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">
                  Clientes Ativos
                </p>
                <p className="text-3xl font-bold text-green-900">
                  {customers.filter((c) => c.active).length}
                </p>
              </div>
              <Check className="h-12 w-12 text-green-600" />
            </div>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard delay={0.3}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">
                  Clientes Inativos
                </p>
                <p className="text-3xl font-bold text-amber-900">
                  {customers.filter((c) => !c.active).length}
                </p>
              </div>
              <X className="h-12 w-12 text-amber-600" />
            </div>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard delay={0.4}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">
                  Com Email
                </p>
                <p className="text-3xl font-bold text-purple-900">
                  {customers.filter((c) => c.email).length}
                </p>
              </div>
              <User className="h-12 w-12 text-purple-600" />
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
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 text-sm"
              />
              {searchTerm && (
                <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
                  {customers.length}
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
                  setStatusFilter("all");
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

      {/* Tabela de Clientes */}
      <AnimatedCard>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">
            Lista de Clientes
          </CardTitle>
          <CardDescription>
            {customers.length} cliente{customers.length !== 1 ? "s" : ""} encontrado
            {customers.length !== 1 ? "s" : ""} • Página {currentPage} de {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-4 text-muted-foreground">Carregando clientes...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Erro ao carregar clientes
              </h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button
                onClick={loadCustomers}
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
                      Cliente
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground">
                      Contato
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground">
                      Endereço
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
                  {currentCustomers.map((customer, index) => (
                    <motion.tr
                      key={customer.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="border-b border-border hover:bg-accent/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              <a
                                href={`/admin/customers/${customer.id}`}
                                className="hover:underline"
                              >
                                {customer.name}
                              </a>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Cadastrado em{" "}
                              {new Date(customer.createdAt).toLocaleDateString(
                                "pt-BR"
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-sm text-foreground">
                            <Phone className="h-4 w-4" />
                            {customer.phone}
                          </div>
                          {customer.email && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-sm text-foreground">
                          {customer.address ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {customer.address.street && customer.address.number 
                                  ? `${customer.address.street}, ${customer.address.number}`
                                  : customer.address.street || customer.address.number || "-"
                                }
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">-</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        {(() => {
                          const statusInfo = getStatusInfo(customer.active);
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
                        <CustomerActionsMenu
                          onEdit={() => openForm(customer)}
                          onDelete={() => setDeleteConfirm(customer.id)}
                          onDownload={() => downloadBarcode(customer)}
                          hasBarcode={!!customer.barcode}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>

              {currentCustomers.length === 0 && customers.length === 0 && (
                <div className="text-center py-12">
                  <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Nenhum cliente encontrado
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== "all"
                      ? "Tente ajustar os filtros de busca"
                      : "Comece cadastrando o primeiro cliente"}
                  </p>
                  {!searchTerm && statusFilter === "all" && (
                    <Button
                      onClick={() => openForm()}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Cadastrar Cliente
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </AnimatedCard>

      {/* Componente de Paginação */}
      {customers.length > 0 && totalPages > 1 && (
        <AnimatedCard>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Informações da paginação */}
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(endIndex, customers.length)} de {customers.length} clientes
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
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background shadow-2xl border border-border rounded-lg">
            <div className="border-b border-border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {editingCustomer ? "Editar Cliente" : "Novo Cliente"}
                  </h2>
                  <p className="text-muted-foreground">
                    {editingCustomer
                      ? "Atualize as informações do cliente"
                      : "Preencha os dados para cadastrar um novo cliente"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeForm}
                  className="h-8 w-8 rounded-lg hover:bg-accent"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Nome *
                    </label>
                    <Input
                      placeholder="Nome completo"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="rounded-lg border-input focus:border-ring focus:ring-ring/20"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Telefone *
                    </label>
                    <Input
                      placeholder="(00) 00000-0000"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      className="rounded-lg border-input focus:border-ring focus:ring-ring/20"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="cliente@email.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      className="rounded-lg border-input focus:border-ring focus:ring-ring/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Código de Barras
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="0123456789012"
                        value={formData.barcode}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            barcode: e.target.value,
                          }))
                        }
                        className="rounded-lg border-input focus:border-ring focus:ring-ring/20"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          // Gerar código de barras no range 1-3 (iniciando com 1, 2 ou 3)
                          const prefix = Math.floor(Math.random() * 3) + 1; // 1, 2 ou 3
                          const randomSuffix = Math.floor(
                            Math.random() * 1000000000000
                          );
                          const randomBarcode =
                            prefix * 1000000000000 + randomSuffix;
                          setFormData((prev) => ({
                            ...prev,
                            barcode: randomBarcode.toString(),
                          }));
                        }}
                        className="px-3 py-2 border-input hover:bg-accent text-xs"
                        title="Gerar código de barras aleatório"
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Documento (CPF/CNPJ)
                    </label>
                    <Input
                      placeholder="000.000.000-00"
                      value={formData.doc}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          doc: e.target.value,
                        }))
                      }
                      className="rounded-lg border-input focus:border-ring focus:ring-ring/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      CEP
                    </label>
                    <Input
                      placeholder="00000-000"
                      value={formData.zip}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          zip: e.target.value,
                        }))
                      }
                      className="rounded-lg border-input focus:border-ring focus:ring-ring/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Estado
                    </label>
                    <Input
                      placeholder="UF"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          state: e.target.value,
                        }))
                      }
                      className="rounded-lg border-input focus:border-ring focus:ring-ring/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Cidade
                    </label>
                    <Input
                      placeholder="Cidade"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                      className="rounded-lg border-input focus:border-ring focus:ring-ring/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Bairro
                    </label>
                    <Input
                      placeholder="Bairro"
                      value={formData.neighborhood}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          neighborhood: e.target.value,
                        }))
                      }
                      className="rounded-lg border-input focus:border-ring focus:ring-ring/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Rua
                    </label>
                    <Input
                      placeholder="Nome da rua"
                      value={formData.street}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          street: e.target.value,
                        }))
                      }
                      className="rounded-lg border-input focus:border-ring focus:ring-ring/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Número
                    </label>
                    <Input
                      placeholder="Número"
                      value={formData.number}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          number: e.target.value,
                        }))
                      }
                      className="rounded-lg border-input focus:border-ring focus:ring-ring/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Complemento
                    </label>
                    <Input
                      placeholder="Complemento"
                      value={formData.complement}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          complement: e.target.value,
                        }))
                      }
                      className="rounded-lg border-input focus:border-ring focus:ring-ring/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            active: e.target.checked,
                          }))
                        }
                        className="peer h-6 w-11 rounded-full border-2 border-input bg-muted transition-colors checked:border-ring checked:bg-ring focus:outline-none focus:ring-0"
                      />
                      <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-transform peer-checked:translate-x-5"></span>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      Cliente ativo
                    </span>
                  </label>
                </div>

                {/* Separator */}
                <div className="border-t border-border my-6"></div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeForm}
                    className="px-6 py-2 rounded-lg border-input hover:bg-accent"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 px-6 py-2 rounded-lg"
                  >
                    {editingCustomer ? "Atualizar" : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background shadow-2xl border border-border rounded-lg">
            <div className="text-center border-b border-border p-6">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Confirmar Exclusão
              </h3>
              <p className="text-muted-foreground">
                Tem certeza que deseja remover este cliente? Esta ação não pode
                ser desfeita.
              </p>
            </div>

            <div className="p-6">
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-6 py-2 rounded-lg border-input hover:bg-accent"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => deleteCustomer(deleteConfirm)}
                  className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          </div>
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
