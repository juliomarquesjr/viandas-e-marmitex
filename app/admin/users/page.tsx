"use client";

import * as React from "react";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import { useToast } from "../../components/Toast";
import { DeleteConfirmDialog } from "../../components/DeleteConfirmDialog";
import { UserFormDialog } from "../../components/UserFormDialog";
import { PageHeader } from "../components/layout";
import { DataTable, Column } from "../components/data-display";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge, StatusBadge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { FacialCaptureModal } from "../components/FacialCaptureModal";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  User,
  Camera,
  ScanFace,
  LayoutList,
  LayoutGrid,
} from "lucide-react";
import { UserStatsCards } from "./components/UserStatsCards";
import { UsersPageSkeleton } from "./components/UsersPageSkeleton";
import { UserGridView } from "./components/UserGridView";

// =============================================================================
// TIPOS
// =============================================================================

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "pdv";
  status: "active" | "inactive";
  imageUrl?: string;
  facialImageUrl?: string;
  createdAt: string;
  updatedAt: string;
};

// =============================================================================
// MENU DE AÇÕES
// =============================================================================

function UserActionsMenu({
  user,
  onEdit,
  onDelete,
  onFacialCapture,
}: {
  user: User;
  onEdit: () => void;
  onDelete: () => void;
  onFacialCapture: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(!open)}
        aria-label="Ações"
      >
        <MoreVertical className="h-4 w-4" />
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-48 bg-white rounded-lg border border-slate-200 shadow-lg py-1">
          <button
            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onFacialCapture();
            }}
          >
            <Camera className="h-4 w-4 mr-2 text-slate-400" />
            {user.facialImageUrl ? "Atualizar Foto" : "Foto Facial"}
          </button>
          <button
            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            <Edit className="h-4 w-4 mr-2 text-slate-400" />
            Editar
          </button>
          <button
            className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remover
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function AdminUsersPage() {
  const { showToast } = useToast();

  // Estados de dados
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Estado de visualização (tabela ou cards)
  const [viewMode, setViewMode] = React.useState<"table" | "grid">(() => {
    if (typeof window === "undefined") return "table";
    return (sessionStorage.getItem("users-view-mode") as "table" | "grid") ?? "table";
  });

  const handleViewModeChange = (mode: "table" | "grid") => {
    setViewMode(mode);
    sessionStorage.setItem("users-view-mode", mode);
  };

  // Estados de busca e filtros
  const [searchInput, setSearchInput] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<"all" | "admin" | "pdv">("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");

  // Estados de paginação
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  // Estados do formulário
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);

  // Estados de confirmação
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [confirmMessage, setConfirmMessage] = React.useState("");
  const [pendingAction, setPendingAction] = React.useState<(() => void) | null>(null);
  const [isDeletingUser, setIsDeletingUser] = React.useState(false);

  // Estados de captura facial
  const [facialModalOpen, setFacialModalOpen] = React.useState(false);
  const [selectedUserForFacial, setSelectedUserForFacial] = React.useState<User | null>(null);

  // Debounce da busca
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Carregar usuários
  const loadUsers = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/users?q=${searchTerm}&role=${roleFilter}&status=${statusFilter}`
      );
      if (!response.ok) throw new Error("Falha ao carregar usuários");
      const result = await response.json();
      setUsers(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter, statusFilter]);

  React.useEffect(() => {
    loadUsers();
    setCurrentPage(1);
  }, [loadUsers]);

  // Funções do formulário
  const openForm = (user?: User) => {
    setEditingUser(user || null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
  };

  const handleFormSubmit = async (e: React.FormEvent, formData: any) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast("Por favor, informe o nome do usuário.", "error");
      return;
    }

    if (!formData.email.trim()) {
      showToast("Por favor, informe o e-mail do usuário.", "error");
      return;
    }

    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        role: formData.role,
        status: formData.status,
        password: formData.password || undefined,
        imageUrl: formData.imageUrl || null,
      };

      if (editingUser) {
        const response = await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingUser.id, ...userData }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Falha ao atualizar usuário");
        }

        const updatedUser = await response.json();
        setUsers((prev) =>
          prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
        );
        showToast("Usuário atualizado com sucesso!", "success");
        closeForm();
      } else {
        const response = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Falha ao criar usuário");
        }

        const newUser = await response.json();
        setUsers((prev) => [...prev, newUser]);
        showToast("Usuário cadastrado com sucesso!", "success");
        closeForm();
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Falha ao salvar usuário",
        "error"
      );
    }
  };

  const deleteUser = async (id: string) => {
    setIsDeletingUser(true);
    try {
      const response = await fetch(`/api/users?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Falha ao excluir usuário");
      }

      setUsers((prev) => prev.filter((u) => u.id !== id));
      showToast("Usuário excluído com sucesso!", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Falha ao excluir usuário",
        "error"
      );
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    setConfirmMessage(`Tem certeza que deseja remover o usuário "${user.name}"? Esta ação não pode ser desfeita.`);
    setPendingAction(() => () => deleteUser(user.id));
    setIsConfirmOpen(true);
  };

  const handleFacialCapture = (user: User) => {
    setSelectedUserForFacial(user);
    setFacialModalOpen(true);
  };

  // Obter informações do perfil
  const getRoleInfo = (role: User["role"]) => {
    switch (role) {
      case "admin":
        return { label: "Administrador", icon: Shield };
      case "pdv":
        return { label: "PDV", icon: User };
      default:
        return { label: "Usuário", icon: User };
    }
  };

  // Colunas da tabela
  const columns: Column<User>[] = [
    {
      key: "name",
      header: "Usuário",
      render: (_, user) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            {user.imageUrl ? (
              <img src={user.imageUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <User className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{user.name}</p>
            <p className="text-xs text-slate-500">
              {new Date(user.createdAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contato",
      render: (_, user) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-sm text-slate-700">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            <span className="truncate max-w-[200px]">{user.email}</span>
          </div>
          {user.phone && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Phone className="h-3 w-3" />
              {user.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "role",
      header: "Perfil",
      align: "center",
      render: (_, user) => {
        const roleInfo = getRoleInfo(user.role);
        const Icon = roleInfo.icon;
        return (
          <Badge
            variant={user.role === "admin" ? "primary" : "default"}
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Icon className="h-3.5 w-3.5" />
            {roleInfo.label}
          </Badge>
        );
      },
    },
    {
      key: "facial",
      header: "Reconhecimento Facial",
      align: "center",
      render: (_, user) => {
        if (!user.facialImageUrl) {
          return <span className="text-slate-400 text-sm">Não cadastrado</span>;
        }
        return (
          <Badge variant="secondary" size="sm" className="flex items-center gap-1.5">
            <ScanFace className="h-3.5 w-3.5" />
            Cadastrado
          </Badge>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (_, user) => (
        <StatusBadge status={user.status === "active" ? "active" : "inactive"} size="sm" />
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (_, user) => (
        <UserActionsMenu
          user={user}
          onEdit={() => openForm(user)}
          onDelete={() => handleDeleteClick(user)}
          onFacialCapture={() => handleFacialCapture(user)}
        />
      ),
    },
  ];

  // Dados paginados para o grid view
  const paginatedUsers = users.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Usuários"
          description="Gerencie os usuários do sistema"
          icon={Users}
          actions={
            <Button onClick={() => openForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          }
        />

        {loading && users.length === 0 ? (
          <UsersPageSkeleton />
        ) : (
          <>
            {/* Estatísticas */}
            <UserStatsCards users={users} />

            {/* Barra de Filtros */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                  {/* Busca Principal */}
                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Buscar usuários..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-10 pr-4 py-2 text-sm"
                    />
                  </div>

                  {/* Filtros, Ações e Toggle de Visão */}
                  <div className="flex flex-wrap gap-3 w-full lg:w-auto items-center">
                    <div className="relative">
                      <select
                        value={roleFilter}
                        onChange={(e) =>
                          setRoleFilter(e.target.value as typeof roleFilter)
                        }
                        className="appearance-none bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all w-full md:w-36"
                      >
                        <option value="all">Todos os Perfis</option>
                        <option value="admin">Administrador</option>
                        <option value="pdv">PDV</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <svg
                          className="h-4 w-4 text-slate-400"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>

                    <div className="relative">
                      <select
                        value={statusFilter}
                        onChange={(e) =>
                          setStatusFilter(e.target.value as typeof statusFilter)
                        }
                        className="appearance-none bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all w-full md:w-32"
                      >
                        <option value="all">Todos os Status</option>
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <svg
                          className="h-4 w-4 text-slate-400"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchInput("");
                        setRoleFilter("all");
                        setStatusFilter("all");
                      }}
                      className="h-9 px-3 text-sm"
                    >
                      Limpar
                    </Button>

                    {/* Toggle de Visualização */}
                    <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden shrink-0">
                      <button
                        type="button"
                        onClick={() => handleViewModeChange("table")}
                        className={`flex items-center justify-center h-9 w-9 transition-colors ${
                          viewMode === "table"
                            ? "bg-primary text-white"
                            : "bg-white text-slate-500 hover:bg-slate-50"
                        }`}
                        title="Visualização em tabela"
                        aria-label="Visualização em tabela"
                      >
                        <LayoutList className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewModeChange("grid")}
                        className={`flex items-center justify-center h-9 w-9 transition-colors ${
                          viewMode === "grid"
                            ? "bg-primary text-white"
                            : "bg-white text-slate-500 hover:bg-slate-50"
                        }`}
                        title="Visualização em mosaico"
                        aria-label="Visualização em mosaico"
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conteúdo: Tabela ou Grid */}
            {error ? (
              <Card>
                <CardContent className="p-0">
                  <div className="text-center py-12">
                    <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                      <div className="h-6 w-6 rounded-full bg-red-500" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">
                      Erro ao carregar usuários
                    </h3>
                    <p className="text-slate-500 mb-4">{error}</p>
                    <Button onClick={loadUsers}>Tentar novamente</Button>
                  </div>
                </CardContent>
              </Card>
            ) : viewMode === "table" ? (
              <Card>
                <CardContent className="p-0">
                  <DataTable
                    columns={columns}
                    data={users}
                    rowKey="id"
                    pagination={{
                      page: currentPage,
                      pageSize: itemsPerPage,
                      total: users.length,
                      onPageChange: setCurrentPage,
                      onPageSizeChange: setItemsPerPage,
                    }}
                    emptyMessage={
                      searchTerm || roleFilter !== "all" || statusFilter !== "all"
                        ? "Nenhum usuário encontrado com os filtros aplicados"
                        : "Nenhum usuário cadastrado"
                    }
                  />
                </CardContent>
              </Card>
            ) : (
              <UserGridView
                users={paginatedUsers}
                onEdit={openForm}
                onDelete={(id) => {
                  const user = users.find((u) => u.id === id);
                  if (user) handleDeleteClick(user);
                }}
                onFacialCapture={handleFacialCapture}
                pagination={{
                  page: currentPage,
                  pageSize: itemsPerPage,
                  total: users.length,
                  onPageChange: setCurrentPage,
                  onPageSizeChange: setItemsPerPage,
                }}
                emptyMessage={
                  searchTerm || roleFilter !== "all" || statusFilter !== "all"
                    ? "Nenhum usuário encontrado com os filtros aplicados"
                    : "Nenhum usuário cadastrado"
                }
              />
            )}
          </>
        )}

        {/* Modal de Formulário */}
        {isFormOpen && (
          <UserFormDialog
            isOpen={isFormOpen}
            onClose={closeForm}
            onSubmit={handleFormSubmit}
            user={editingUser}
          />
        )}

        {/* Modal de Confirmação */}
        <DeleteConfirmDialog
          open={isConfirmOpen}
          onOpenChange={(open) => {
            setIsConfirmOpen(open);
            if (!open) setPendingAction(null);
          }}
          title="Confirmar Exclusão"
          description={confirmMessage}
          onConfirm={() => {
            if (pendingAction) {
              pendingAction();
            }
            setPendingAction(null);
          }}
          isLoading={isDeletingUser}
        />

        {/* Modal de Captura Facial */}
        {facialModalOpen && selectedUserForFacial && (
          <FacialCaptureModal
            isOpen={facialModalOpen}
            onClose={() => {
              setFacialModalOpen(false);
              setSelectedUserForFacial(null);
            }}
            userId={selectedUserForFacial.id}
            userName={selectedUserForFacial.name}
            currentFacialImageUrl={selectedUserForFacial.facialImageUrl}
            onSuccess={() => {
              loadUsers();
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
