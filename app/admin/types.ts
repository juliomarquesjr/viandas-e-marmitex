export type RangeOption = {
    label: string;
    value: number;
};

export type SalesPoint = {
    day: string;
    total: number;
    pending: number;
    confirmed: number;
};

export type ApiOrderItem = {
    id: string;
    quantity: number;
    priceCents: number | null;
    product: {
        id: string;
        name: string | null;
    } | null;
};

export type ApiOrder = {
    id: string;
    status: string;
    totalCents: number | null;
    createdAt: string;
    paymentMethod: string | null;
    items: ApiOrderItem[] | null;
};

export type StatusTotals = {
    pending: number;
    confirmed: number;
};
