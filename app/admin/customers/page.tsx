"use client";

import * as React from "react";
import { useToast } from "../../components/Toast";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { DeleteConfirmDialog } from "../../components/DeleteConfirmDialog";
import { CustomerFormDialog } from "../../components/CustomerFormDialog";
import { PageHeader } from "../components/layout";
import { DataTable, Column } from "../components/data-display";
import { Button } from "../../components/ui/button";
import { StatusBadge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import {
  Users,
  Plus,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  Edit,
  Trash2,
  Barcode,
  User,
} from "lucide-react";
import { CustomerStatsCards } from "./components/CustomerStatsCards";
import { CustomerPageSkeleton } from "./components/CustomerSkeletonLoader";
import { CustomerGridView } from "./components/CustomerGridView";
import { CustomerSummaryModal } from "./components/CustomerSummaryModal";
import { CustomerFilterBar } from "./components/CustomerFilterBar";

// =============================================================================
// TIPOS
// =============================================================================

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  doc?: string;
  barcode?: string;
  imageUrl?: string;
  address?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
  };
  active: boolean;
  createdAt: string;
};

// =============================================================================
// MENU DE AÇÕES
// =============================================================================

function CustomerActionsMenu({
  customer,
  onEdit,
  onDelete,
  onDownloadBarcode,
}: {
  customer: Customer;
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
        {customer.barcode && (
          <button
            type="button"
            className="flex items-center w-full whitespace-nowrap px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-sm"
            onClick={() => {
              setOpen(false);
              onDownloadBarcode();
            }}
          >
            <Barcode className="h-4 w-4 mr-2 shrink-0 text-slate-400" />
            Código de Barras
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

export default function AdminCustomersPage() {
  const { showToast } = useToast();
  const pageSizeOptions = React.useMemo(() => [10, 25, 50, 100], []);

  // Estados de dados
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // View mode (table | grid) — persiste em sessionStorage
  const [viewMode, setViewMode] = React.useState<"table" | "grid">(() => {
    if (typeof window === "undefined") return "table";
    return (sessionStorage.getItem("customers-view-mode") as "table" | "grid") ?? "table";
  });

  const handleViewModeChange = (mode: "table" | "grid") => {
    setViewMode(mode);
    sessionStorage.setItem("customers-view-mode", mode);
  };

  const handleItemsPerPageChange = React.useCallback(
    (size: number) => {
      const defaultPageSize = pageSizeOptions[0];
      const normalizedSize = pageSizeOptions.includes(size) ? size : defaultPageSize;
      setItemsPerPage(normalizedSize);
      setCurrentPage(1);
      sessionStorage.setItem("customers-items-per-page", String(normalizedSize));
    },
    [pageSizeOptions]
  );

  // Estados de busca e filtros
  const [searchInput, setSearchInput] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");

  // Estados de paginação
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(() => {
    if (typeof window === "undefined") return 10;
    const defaultPageSize = pageSizeOptions[0];
    const savedValue = Number(sessionStorage.getItem("customers-items-per-page"));
    if (Number.isNaN(savedValue)) return defaultPageSize;
    return pageSizeOptions.includes(savedValue) ? savedValue : defaultPageSize;
  });

  // Estados do formulário
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null);
  const [formData, setFormData] = React.useState({
    name: "",
    phone: "",
    email: "",
    doc: "",
    barcode: "",
    password: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zip: "",
    active: true,
    imageUrl: "",
  });

  // Estado do modal de resumo
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);

  // Estados de confirmação
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [confirmMessage, setConfirmMessage] = React.useState("");
  const [pendingAction, setPendingAction] = React.useState<(() => void) | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = React.useState(false);

  // Debounce da busca
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Carregar clientes
  const loadCustomers = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/customers", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!response.ok) throw new Error("Falha ao carregar clientes");
      const result = await response.json();
      setCustomers(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Funções do formulário
  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      doc: "",
      barcode: "",
      password: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zip: "",
      active: true,
      imageUrl: "",
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
        password: "",
        street: address.street || "",
        number: address.number || "",
        complement: "",
        neighborhood: address.neighborhood || "",
        city: address.city || "",
        state: "",
        zip: "",
        active: customer.active,
        imageUrl: customer.imageUrl || "",
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

  const handleFormSubmit = async (e: React.FormEvent, formData: any) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast("Por favor, informe o nome do cliente.", "error");
      return;
    }

    if (!formData.phone.trim()) {
      showToast("Por favor, informe o telefone do cliente.", "error");
      return;
    }

    try {
      const address = {
        street: formData.street,
        number: formData.number,
        complement: formData.complement,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
      };

      const customerData: any = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email?.trim() || null,
        doc: formData.doc || undefined,
        barcode: formData.barcode || undefined,
        address: Object.values(address).some((v) => v) ? address : undefined,
        active: formData.active,
        imageUrl: formData.imageUrl || null,
      };

      if (formData.password?.trim()) {
        customerData.password = formData.password.trim();
      }

      if (editingCustomer) {
        const response = await fetch("/api/customers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingCustomer.id, ...customerData }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Falha ao atualizar cliente");
        }

        const updatedCustomer = await response.json();
        setCustomers((prev) =>
          prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c))
        );
        showToast("Cliente atualizado com sucesso!", "success");
        closeForm();
      } else {
        const response = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(customerData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Falha ao criar cliente");
        }

        const newCustomer = await response.json();
        setCustomers((prev) => [...prev, newCustomer]);
        showToast("Cliente cadastrado com sucesso!", "success");
        closeForm();
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Falha ao salvar cliente",
        "error"
      );
    }
  };

  const deleteCustomer = async (id: string) => {
    setIsDeletingCustomer(true);
    try {
      const response = await fetch(`/api/customers?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Falha ao excluir cliente");
      }

      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirm(null);
      showToast("Cliente excluído com sucesso!", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Falha ao excluir cliente",
        "error"
      );
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  const downloadBarcode = async (customer: Customer) => {
    if (!customer.barcode) {
      showToast("Este cliente não possui código de barras.", "error");
      return;
    }

    try {
      const barcodeUrl = `https://barcodeapi.org/api/code128/${customer.barcode}`;
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
            a.download = `barcode-${customer.name.replace(/\s+/g, "-")}-${customer.barcode}.png`;
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

  const filteredCustomers = React.useMemo(() => {
    const rawSearch = searchTerm.trim();
    const normalizedSearch = rawSearch.toLowerCase();

    return customers.filter((customer) => {
      const matchesSearch =
        !normalizedSearch ||
        customer.name.toLowerCase().includes(normalizedSearch) ||
        customer.phone.includes(rawSearch) ||
        customer.email?.toLowerCase().includes(normalizedSearch) ||
        customer.doc?.includes(rawSearch) ||
        customer.barcode?.includes(rawSearch);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && customer.active) ||
        (statusFilter === "inactive" && !customer.active);

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchTerm, statusFilter]);

  const totalFilteredPages = Math.max(
    1,
    Math.ceil(filteredCustomers.length / itemsPerPage) || 1
  );

  const paginatedCustomers = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  React.useEffect(() => {
    if (currentPage > totalFilteredPages) {
      setCurrentPage(totalFilteredPages);
    }
  }, [currentPage, totalFilteredPages]);

  // Colunas da tabela
  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Cliente",
      render: (_, customer) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
            {customer.imageUrl ? (
              <img
                src={customer.imageUrl}
                alt={customer.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <span className="font-medium text-slate-900 truncate block">
              {customer.name}
            </span>
            <p className="text-xs text-slate-500">
              {new Date(customer.createdAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Contato",
      render: (_, customer) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-sm text-slate-700">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            {customer.phone}
          </div>
          {customer.email && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Mail className="h-3 w-3" />
              <span className="truncate max-w-[200px]">{customer.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "address",
      header: "Endereço",
      render: (_, customer) => {
        const address = customer.address;
        if (!address?.street) {
          return <span className="text-slate-400 text-sm">Não informado</span>;
        }
        return (
          <div className="flex items-start gap-1.5 text-sm text-slate-600 max-w-[200px]">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="truncate">
              {address.street}, {address.number}
              {address.neighborhood && ` - ${address.neighborhood}`}
            </span>
          </div>
        );
      },
    },
    {
      key: "active",
      header: "Status",
      align: "center",
      render: (_, customer) => (
        <StatusBadge status={customer.active ? "active" : "inactive"} size="sm" />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Clientes"
        description="Gerencie os clientes do estabelecimento"
        icon={Users}
        actions={
          <Button size="sm" onClick={() => openForm()}>
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Cliente
          </Button>
        }
      />

      {loading && customers.length === 0 ? (
        <CustomerPageSkeleton />
      ) : (
        <>
          {/* Estatísticas */}
          <CustomerStatsCards customers={customers} />

          {/* Filtros */}
          <CustomerFilterBar
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            totalCount={customers.length}
            filteredCount={filteredCustomers.length}
          />

          {/* Listagem */}
          {error ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={loadCustomers}>Tentar novamente</Button>
              </CardContent>
            </Card>
          ) : viewMode === "table" ? (
            <DataTable
              data={filteredCustomers}
              columns={columns}
              rowKey="id"
              emptyMessage="Nenhum cliente encontrado"
              onRowClick={(customer) => setSelectedCustomer(customer)}
              rowActions={(customer) => (
                <CustomerActionsMenu
                  customer={customer}
                  onEdit={() => openForm(customer)}
                  onDelete={() => setDeleteConfirm(customer.id)}
                  onDownloadBarcode={() => downloadBarcode(customer)}
                />
              )}
              pagination={{
                page: currentPage,
                pageSize: itemsPerPage,
                total: filteredCustomers.length,
                onPageChange: setCurrentPage,
                onPageSizeChange: handleItemsPerPageChange,
              }}
            />
          ) : (
            <CustomerGridView
              customers={paginatedCustomers}
              onEdit={openForm}
              onDelete={(id) => setDeleteConfirm(id)}
              onDownloadBarcode={downloadBarcode}
              onCardClick={(customer) => setSelectedCustomer(customer)}
              pagination={{
                page: currentPage,
                pageSize: itemsPerPage,
                total: filteredCustomers.length,
                onPageChange: setCurrentPage,
                onPageSizeChange: handleItemsPerPageChange,
              }}
            />
          )}
        </>
      )}

      {/* Modal de Resumo do Cliente */}
      <CustomerSummaryModal
        open={selectedCustomer !== null}
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onEdit={() => {
          openForm(selectedCustomer!);
          setSelectedCustomer(null);
        }}
      />

      {/* Dialog de Formulário */}
      <CustomerFormDialog
        open={isFormOpen}
        onClose={closeForm}
        onSubmit={handleFormSubmit}
        editingCustomer={editingCustomer}
        initialFormData={formData}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <DeleteConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Excluir Cliente"
        description="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
        onConfirm={() => deleteConfirm && deleteCustomer(deleteConfirm)}
        isLoading={isDeletingCustomer}
      />

      {/* Dialog de Confirmação Genérico */}
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={(open) => !open && setIsConfirmOpen(false)}
        title="Atenção"
        description={confirmMessage}
        confirmText="OK"
        onConfirm={() => {
          pendingAction?.();
          setIsConfirmOpen(false);
        }}
      />
    </div>
  );
}
