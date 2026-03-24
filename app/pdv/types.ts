export type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  weightKg?: number;
  isWeightBased?: boolean;
};

export type Customer = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  barcode?: string;
  imageUrl?: string;
  address?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
};

export type Product = {
  id: string;
  name: string;
  priceCents: number;
  pricePerKgCents?: number;
  barcode?: string;
  imageUrl?: string;
  active: boolean;
  productType: "sellable" | "addon";
  stockEnabled?: boolean;
  stock?: number;
};

export type PaymentData = {
  method: string;
  cashReceived?: number;
  change?: number;
};

export type DiscountState = {
  type: "percent" | "amount";
  value: number;
} | null;
