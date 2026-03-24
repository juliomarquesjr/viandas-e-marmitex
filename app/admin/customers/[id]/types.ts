export interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  doc?: string;
  barcode?: string;
  address?: any;
  imageUrl?: string | null;
  active: boolean;
  createdAt: string;
};

export type Order = {
  id: string;
  status: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  paymentMethod: string | null;
  createdAt: string;
  items: {
    id: string;
    quantity: number;
    priceCents: number;
    weightKg?: number | null;
    product: {
      id: string;
      name: string;
      imageUrl?: string | null;
      pricePerKgCents?: number | null;
    };
  }[];
  type?: string; // Adicionado para identificar ficha payments
};
