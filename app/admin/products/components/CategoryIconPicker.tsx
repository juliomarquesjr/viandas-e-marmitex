"use client";

import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ── Lista curada de ícones disponíveis para categorias ─────────────────────
export const CATEGORY_ICONS: { name: string; label: string }[] = [
  // Preparo / Cozinha
  { name: "ChefHat",           label: "Chef" },
  { name: "CookingPot",        label: "Panela" },
  { name: "UtensilsCrossed",   label: "Talheres" },
  { name: "Utensils",          label: "Garfo/Faca" },
  { name: "ForkKnife",         label: "Refeição" },
  { name: "Soup",              label: "Sopa" },
  // Pratos
  { name: "Salad",             label: "Salada" },
  { name: "Pizza",             label: "Pizza" },
  { name: "Sandwich",          label: "Sanduíche" },
  { name: "Beef",              label: "Carne" },
  { name: "Drumstick",         label: "Frango" },
  { name: "Shrimp",            label: "Camarão" },
  { name: "Fish",              label: "Peixe" },
  { name: "Egg",               label: "Ovo" },
  { name: "EggFried",          label: "Ovo Frito" },
  { name: "Croissant",         label: "Pão" },
  { name: "Wheat",             label: "Trigo" },
  // Sobremesas / Doces
  { name: "Cake",              label: "Bolo" },
  { name: "CakeSlice",         label: "Fatia Bolo" },
  { name: "Donut",             label: "Rosquinha" },
  { name: "Cookie",            label: "Biscoito" },
  { name: "IceCream",          label: "Sorvete" },
  { name: "IceCreamCone",      label: "Casquinha" },
  { name: "Candy",             label: "Doce" },
  { name: "CandyCane",         label: "Bala" },
  { name: "Popcorn",           label: "Pipoca" },
  // Frutas / Vegetais
  { name: "Apple",             label: "Maçã" },
  { name: "Banana",            label: "Banana" },
  { name: "Cherry",            label: "Cereja" },
  { name: "Grape",             label: "Uva" },
  { name: "Citrus",            label: "Cítrico" },
  { name: "Nut",               label: "Castanha" },
  { name: "Carrot",            label: "Cenoura" },
  { name: "Leaf",              label: "Natural" },
  // Bebidas
  { name: "Coffee",            label: "Café" },
  { name: "Milk",              label: "Leite" },
  { name: "Beer",              label: "Cerveja" },
  { name: "Wine",              label: "Vinho" },
  { name: "BottleWine",        label: "Garrafa" },
  // Móveis / Sala
  { name: "Sofa",              label: "Sofá" },
  { name: "Armchair",          label: "Poltrona" },
  { name: "Tv",                label: "TV" },
  { name: "Monitor",           label: "Monitor" },
  { name: "Lamp",              label: "Luminária" },
  { name: "LampDesk",          label: "Abajur" },
  { name: "LampFloor",         label: "Luminária Pé" },
  { name: "LampCeiling",       label: "Plafon" },
  // Móveis / Quarto
  { name: "Bed",               label: "Cama" },
  { name: "BedDouble",         label: "Cama Casal" },
  { name: "BedSingle",         label: "Cama Solteiro" },
  // Eletrodomésticos
  { name: "Refrigerator",      label: "Geladeira" },
  { name: "Microwave",         label: "Micro-ondas" },
  { name: "WashingMachine",    label: "Lavanderia" },
  // Banheiro / Área
  { name: "Bath",              label: "Banheira" },
  { name: "ShowerHead",        label: "Chuveiro" },
  { name: "Fence",             label: "Área Ext." },
  // Ferramentas / Instalação
  { name: "Hammer",            label: "Martelo" },
  { name: "Drill",             label: "Furadeira" },
  { name: "Wrench",            label: "Ferramenta" },
  // Geral / Negócio
  { name: "ShoppingBag",       label: "Sacola" },
  { name: "Package",           label: "Embalagem" },
  { name: "Box",               label: "Caixa" },
  { name: "Tag",               label: "Etiqueta" },
  { name: "Gift",              label: "Presente" },
  { name: "Star",              label: "Destaque" },
  { name: "Flame",             label: "Popular" },
  { name: "Sparkles",          label: "Especial" },
  { name: "Crown",             label: "Premium" },
  { name: "Heart",             label: "Favorito" },
  { name: "Percent",           label: "Promoção" },
  { name: "Truck",             label: "Entrega" },
  { name: "Clock",             label: "Rápido" },
  { name: "Home",              label: "Casa" },
  { name: "Users",             label: "Família" },
  { name: "Sun",               label: "Almoço" },
  { name: "Moon",              label: "Jantar" },
  { name: "CalendarDays",      label: "Semanal" },
];

// ── Helper para renderizar ícone dinamicamente pelo nome ───────────────────
export function DynamicCategoryIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = (LucideIcons as Record<string, LucideIcon | unknown>)[name] as LucideIcon | undefined;
  if (!Icon) return null;
  return <Icon className={className} />;
}

// ── Componente picker ──────────────────────────────────────────────────────
interface CategoryIconPickerProps {
  value: string | null | undefined;
  onChange: (iconName: string | null) => void;
}

export function CategoryIconPicker({ value, onChange }: CategoryIconPickerProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-6 gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-52 overflow-y-auto">
        {CATEGORY_ICONS.map(({ name, label }) => {
          const Icon = (LucideIcons as Record<string, LucideIcon | unknown>)[name] as LucideIcon | undefined;
          if (!Icon) return null;
          const selected = value === name;
          return (
            <button
              key={name}
              type="button"
              title={label}
              onClick={() => onChange(selected ? null : name)}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all text-[10px] font-medium leading-tight ${
                selected
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-500 hover:bg-white hover:text-primary hover:shadow-sm"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate w-full text-center">{label}</span>
            </button>
          );
        })}
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors"
        >
          Remover ícone
        </button>
      )}
    </div>
  );
}
