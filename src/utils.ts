import type { Invoice, InvoiceStatus, RecurringInterval } from './types';

/** True when running inside a sandboxed frame (e.g. a hosted preview), where print and file downloads are blocked. */
export const isEmbedded = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const todayISO = () => toISO(new Date());

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function addInterval(iso: string, interval: RecurringInterval): string {
  const d = parseISO(iso);
  if (interval === 'weekly') d.setDate(d.getDate() + 7);
  if (interval === 'monthly') d.setMonth(d.getMonth() + 1);
  if (interval === 'quarterly') d.setMonth(d.getMonth() + 3);
  if (interval === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return toISO(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000);
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  return parseISO(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const fmtCache = new Map<string, Intl.NumberFormat>();
export function formatMoney(amount: number, currency: string): string {
  let f = fmtCache.get(currency);
  if (!f) {
    try {
      f = new Intl.NumberFormat(undefined, { style: 'currency', currency });
    } catch {
      f = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
    }
    fmtCache.set(currency, f);
  }
  return f.format(amount || 0);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function invoiceTotals(inv: Pick<Invoice, 'items' | 'taxRate' | 'discountType' | 'discountValue' | 'payments'>) {
  const subtotal = round2(inv.items.reduce((s, i) => s + (i.quantity || 0) * (i.rate || 0), 0));
  const discount = round2(
    inv.discountType === 'percent'
      ? (subtotal * (inv.discountValue || 0)) / 100
      : Math.min(inv.discountValue || 0, subtotal),
  );
  const taxable = subtotal - discount;
  const tax = round2((taxable * (inv.taxRate || 0)) / 100);
  const total = round2(taxable + tax);
  const paid = round2(inv.payments.reduce((s, p) => s + (p.amount || 0), 0));
  const balance = round2(Math.max(total - paid, 0));
  return { subtotal, discount, tax, total, paid, balance };
}

export function invoiceStatus(inv: Invoice, today = todayISO()): InvoiceStatus {
  if (inv.state === 'void') return 'void';
  if (inv.state === 'draft') return 'draft';
  const { total, paid, balance } = invoiceTotals(inv);
  if (total > 0 && balance <= 0) return 'paid';
  if (inv.dueDate < today) return 'overdue';
  if (paid > 0) return 'partial';
  return 'sent';
}

export const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Awaiting payment',
  partial: 'Partially paid',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
};

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'CHF', 'SGD', 'AED', 'NZD', 'ZAR'];

export function downloadFile(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCSV(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\n');
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?'
  );
}
