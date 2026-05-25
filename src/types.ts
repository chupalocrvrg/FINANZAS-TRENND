/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EntityType = 'client' | 'reseller' | 'intermediary' | 'supplier';
export type ServiceStatus = 'active' | 'expired' | 'pending';
export type LedgerType = 'personal' | 'business';
export type WalletType = 'cash' | 'bank' | 'digital_wallet' | 'credit_card';

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  contact?: string;
  rate?: number; // Fixed per-update rate for intermediaries
  createdAt: string;
}

export interface ServiceLog {
  id: string;
  timestamp: string;
  description: string;
  previousValue?: any;
  newValue?: any;
}

export interface DigitalService {
  id: string;
  clientName: string;
  email?: string;
  password?: string;
  pin?: string;
  supplier?: string;
  cost: number;
  retailPrice: number;
  profit: number; // retailPrice - cost
  expirationDate: string;
  status: ServiceStatus;
  history: ServiceLog[];
}

export interface Transaction {
  id: string;
  intermediaryId: string;
  intermediaryName: string;
  finalClientName: string;
  warehouse: string; // Almacén
  billingDate: string;
  baseCost: number; // default $5.00
  chargedRate: number; // from intermediary.rate
  isPaid: boolean;
  status: 'pending' | 'realized';
  liquidationId?: string;
  createdAt: string;
}

export interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  balance: number;
  totalLimit?: number;
}

export interface LedgerEntry {
  id: string;
  type: LedgerType;
  category: string;
  amount: number;
  description: string;
  walletId: string;
  date: string;
  isRecurring?: boolean;
  isPending?: boolean;
  dueDate?: string; // Fecha de pago programada (if pending or recurring)
  installments?: number; // Cuotas a pagar
  isCreditCardPayment?: boolean;
  targetWalletId?: string;
}

export interface DashboardStats {
  netMargin: number;
  incomeProjections: number;
  retentionRate: number;
  totalReceivable: number;
  totalPayable: number;
}
