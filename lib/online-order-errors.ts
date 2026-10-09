import { NextResponse } from 'next/server';

export type OrderErrorCode =
  | 'ORDERING_DISABLED'
  | 'CUSTOMER_INACTIVE'
  | 'INVALID_ITEMS'
  | 'WINDOW_CLOSED'
  | 'PRODUCT_UNAVAILABLE'
  | 'OUT_OF_STOCK'
  | 'TOO_MANY_PENDING'
  | 'RATE_LIMITED';

/** Erro de regra do pedido online: vira JSON { error, code, details } com a mensagem em português para o cliente. */
export class OrderError extends Error {
  constructor(
    public code: OrderErrorCode,
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }

  toResponse() {
    return NextResponse.json({ error: this.message, code: this.code, details: this.details }, { status: this.status });
  }
}
