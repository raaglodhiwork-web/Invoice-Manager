export type ID = string;

export interface Client {
  id: ID;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  notes: string;
  createdAt: string;
}

export interface LineItem {
  id: ID;
  description: string;
  quantity: number;
  rate: number;
}

export interface Payment {
  id: ID;
  date: string;
  amount: number;
  method: string;
  note: string;
}

export type RecurringInterval = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Recurring {
  interval: RecurringInterval;
  nextDate: string;
}

/** Stored lifecycle state. Paid / partial / overdue are derived from payments and dates. */
export type InvoiceState = 'draft' | 'sent' | 'void';

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void';

export interface Invoice {
  id: ID;
  number: string;
  clientId: ID;
  issueDate: string;
  dueDate: string;
  currency: string;
  items: LineItem[];
  taxRate: number;
  discountType: 'percent' | 'amount';
  discountValue: number;
  notes: string;
  terms: string;
  state: InvoiceState;
  sentAt?: string;
  payments: Payment[];
  recurring?: Recurring;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  website: string;
  logo: string; // data URL
}

export interface Settings {
  business: BusinessProfile;
  currency: string;
  taxRate: number;
  paymentTermsDays: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  defaultNotes: string;
  defaultTerms: string;
  paymentInstructions: string;
  accentColor: string;
}

export interface AppData {
  version: 1;
  clients: Client[];
  invoices: Invoice[];
  settings: Settings;
}
