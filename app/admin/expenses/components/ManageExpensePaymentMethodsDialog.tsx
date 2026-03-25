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
import { ExpensePaymentMethod } from "@/lib/types";
import { Check, CreditCard, FileText, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function ManageExpensePaymentMethodsDialog({ isOpen, onClose, onChanged }: Props) {
  const [items, setItems] = useState<ExpensePaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpensePaymentMethod | undefined>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const { showToast } = useToast();

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/expense-payment-methods");
      if (!res.ok) throw new Error();
      setItems(await res.json());
    } catch {
      showToast("Erro ao carregar métodos de pagamento", "error");
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
    setDescription("");
    setActive(true);
    setFormOpen(true);
  };

  const openEdit = (it: ExpensePaymentMethod) => {
    setEditing(it);
    setName(it.name);
    setDescription(it.description || "");
    setActive(!!it.active);
    setFormOpen(true);
  };

  const save = async () => {
    try {
      if (!name.trim()) return;
      setSaving(true);
      const url = editing
        ? `/api/expense-payment-methods/${editing.id}`
        : "/api/expense-payment-methods";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao salvar");
      showToast(editing ? "Método atualizado" : "Método criado", "success");
      setFormOpen(false);
      await load();
      onChanged();
    } catch (e: any) {
      showToast(e?.message || "Erro ao salvar método de pagamento", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (it: ExpensePaymentMethod) => {
    try {
      const res = await fetch(`/api/expense-payment-methods/${it.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao remover");
      showToast("Método removido", "success");
      await load();
      onChanged();
    } catch (e: any) {
      showToast(e?.message || "Erro ao remover método de pagamento", "error");
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
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              Formas de Pagamento
            </DialogTitle>
            <DialogDescription>
              Gerencie as formas de pagamento utilizadas nas despesas
            </DialogDescription>
          </DialogHeader>

          {/* ── Barra superior: contagem + botão ── */}
          <div className="flex items-center justify-between px-6 pt-5 pb-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {loading ? "Carregando..." : `${items.length} forma${items.length !== 1 ? "s" : ""} cadastrada${items.length !== 1 ? "s" : ""}`}
            </p>
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Nova Forma
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
                      <div className="h-3 w-52 bg-slate-100 rounded" />
                    </div>
                    <div className="h-5 w-12 bg-slate-100 rounded-full" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border border-dashed border-slate-200 rounded-xl">
                <Wallet className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">Nenhuma forma de pagamento cadastrada</p>
                <button
                  onClick={openCreate}
                  className="mt-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Criar a primeira
                </button>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Ícone */}
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="h-3.5 w-3.5 text-primary" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 truncate">{it.name}</span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                            it.active
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {it.active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      {it.description && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">{it.description}</p>
                      )}
                    </div>

                    {/* Ações (visíveis no hover) */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(it)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeItem(it)}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                style={{
                  background: "var(--modal-header-icon-bg)",
                  outline: "1px solid var(--modal-header-icon-ring)",
                }}
              >
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              {editing ? "Editar" : "Nova"} Forma de Pagamento
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize os dados da forma de pagamento"
                : "Preencha os dados para criar uma nova forma de pagamento"}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Nome <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9"
                  placeholder="Ex: Cartão de crédito"
                />
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Descrição
              </Label>
              <div className="relative">
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="pl-9"
                  placeholder="Descrição opcional"
                />
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Toggle de status */}
            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Check className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Status ativo</p>
                  <p className="text-xs text-slate-400">Disponível para uso nos registros</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActive(!active)}
                className={`relative flex-shrink-0 h-6 w-11 rounded-full border-2 p-0 cursor-pointer focus:outline-none transition-colors duration-200 ${
                  active ? "border-primary bg-primary" : "border-slate-300 bg-white"
                }`}
              >
                <span
                  className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    active ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
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
              <Button onClick={save} disabled={saving}>
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
