/**
 * Tipos para o sistema de sessão de scan mobile
 */

import { InvoiceData } from '@/lib/nf-scanner/types';

export type ScanType = 'qrcode' | 'barcode';
export type ScanStatus = 'waiting' | 'completed' | 'expired';

export interface ScanSession {
  id: string;
  type: ScanType;
  status: ScanStatus;
  createdAt: Date;
  expiresAt: Date;
  result?: InvoiceData;
}

export interface CreateSessionResponse {
  success: true;
  sessionId: string;
  expiresIn: number;
  scanUrl: string;
}

export interface SessionStatusResponse {
  status: ScanStatus;
  expiresIn?: number;
  result?: {
    invoiceData: InvoiceData;
  };
}

export interface WaitingSessionResponse {
  hasWaitingSession: boolean;
  sessionId?: string;
  expiresIn?: number;
}

export interface SubmitScanRequest {
  action: 'submit';
  sessionId: string;
  qrData: string;
}

export interface SubmitScanResponse {
  success: boolean;
  message: string;
  invoiceData?: InvoiceData;
}

export interface StartSessionRequest {
  action: 'start';
  type?: ScanType;
}

// Duração da sessão em milissegundos (60 segundos)
export const SESSION_DURATION_MS = 60 * 1000;

// Intervalo de polling em milissegundos (2 segundos)
export const POLLING_INTERVAL_MS = 2000;
