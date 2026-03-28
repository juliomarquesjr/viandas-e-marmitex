"use client";

import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Pencil, Plus, Shapes, Tag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { CategoryIconPicker, DynamicCategoryIcon } from "./CategoryIconPicker";

type Category = {
  id: string;
  name: string;
  icon?: string | null;
  _count?: { products: number };
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function ManageCategoriesDialog({ isOpen, onClose, onChanged }: Props) {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | undefined>();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const { showToast } = useToast();

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error();
      const result = await res.json();
      setItems(result.data || []);
    } catch {
      showToast("Erro ao carregar categorias", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen]);

  const openCreate = () => {
    setEditing(undefined);
    setName("");
    setIcon(null);
    setFormOpen(true);
  };

  const openEdit = (item: Category) => {
    setEditing(item);
    setName(item.name);
    setIcon(item.icon || null);
    setFormOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return;
    try {
      setSaving(true);
      const url = editing ? `/api/categories/${editing.id}` : "/api/categories";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), icon: icon || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao salvar");
      showToast(editing ? "Categoria atualizada" : "Categoria criada", "success");
      setFormOpen(false);
      await load();
      onChanged();
    } catch (e: any) {
      showToast(e?.message || "Erro ao salvar categoria", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (item: Category) => {
    const productCount = item._count?.products ?? 0;
    if (productCount > 0) {
      const confirmed = window.confirm(
        `Esta categoria possui ${productCount} produto${productCount !== 1 ? "s" : ""} vinculado${productCount !== 1 ? "s" : ""}. Ao removê-la, esses produtos ficarão sem categoria. Deseja continuar?`
      );
      if (!confirmed) return;
    }
    try {
      const res = await fetch(`/api/categories/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao remover");
      showToast("Categoria removida", "success");
      await load();
      onChanged();
    } catch (e: any) {
      showToast(e?.message || "Erro ao remover categoria", "error");
    }
  };

  return (
    <>
      {/* ── Modal principal — lista ── */}
      <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                style={{
                  background: "var(--modal-header-icon-bg)",
                  outline: "1px solid var(--modal-header-icon-ring)",
                }}
              >
                <Shapes className="h-5 w-5 text-primary" />
              </div>
              Categorias
            </DialogTitle>
            <DialogDescription>
              Gerencie as categorias utilizadas para classificar os produtos
            </DialogDescription>
          </DialogHeader>

          {/* ── Barra superior: contagem + botão ── */}
          <div className="flex items-center justify-between px-6 pt-5 pb-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {loading
                ? "Carregando..."
                : `${items.length} categoria${items.length !== 1 ? "s" : ""} cadastrada${items.length !== 1 ? "s" : ""}`}
            </p>
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Nova Categoria
            </Button>
          </div>

          {/* ── Lista ── */}
          <div className="flex-1 overflow-y-auto px-6 pb-5">
            {loading ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                    <div className="h-8 w-8 rounded-lg bg-slate-200 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-3.5 w-36 bg-slate-200 rounded mb-1.5" />
                      <div className="h-3 w-24 bg-slate-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border border-dashed border-slate-200 rounded-xl">
                <Shapes className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">Nenhuma categoria cadastrada</p>
                <button
                  onClick={openCreate}
                  className="mt-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Criar a primeira
                </button>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Ícone */}
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {item.icon ? (
                        <DynamicCategoryIcon name={item.icon} className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Tag className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-slate-900 truncate block">{item.name}</span>
                      {item._count !== undefined && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {item._count.products}{" "}
                          {item._count.products === 1 ? "produto" : "produtos"}
                        </p>
                      )}
                    </div>

                    {/* Ações (visíveis no hover) */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(item)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeItem(item)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <div />
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal de formulário — criar / editar ── */}
      <Dialog open={formOpen} onOpenChange={(v) => !v && setFormOpen(false)}>
        <DialogContent className="sm:max-w-md" higherZIndex>
          <DialogHeader>
            <DialogTitle>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                style={{
                  background: "var(--modal-header-icon-bg)",
                  outline: "1px solid var(--modal-header-icon-ring)",
                }}
              >
                <Shapes className="h-5 w-5 text-primary" />
              </div>
              {editing ? "Editar" : "Nova"} Categoria
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize os dados da categoria"
                : "Preencha os dados para criar uma nova categoria"}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Nome <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9"
                  placeholder="Ex: Marmitas"
                  autoFocus
                />
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Ícone */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Ícone
              </Label>
              <CategoryIconPicker value={icon} onChange={setIcon} />
            </div>
          </div>

          <DialogFooter>
            <p className="text-xs text-slate-400">
              <span className="text-red-400">*</span> campos obrigatórios
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={save} disabled={saving || !name.trim()}>
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                    Salvando...
                  </span>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
