import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppData, Client, Invoice, Payment, Settings } from './types';
import { demoData, emptyData } from './seed';
import { addDays, addInterval, todayISO, uid } from './utils';

const KEY = 'ledgerly:data:v1';

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed && parsed.version === 1) {
        return { ...parsed, settings: { ...emptyData().settings, ...parsed.settings } };
      }
    }
  } catch {
    /* fall through to demo data */
  }
  return demoData();
}

/** Create drafts for recurring invoices whose next date has arrived. */
function runRecurring(data: AppData): AppData {
  const today = todayISO();
  let { invoices, settings } = data;
  let changed = false;
  const created: Invoice[] = [];
  invoices = invoices.map((inv) => {
    if (!inv.recurring || inv.state === 'void') return inv;
    let rec = inv.recurring;
    let guard = 0;
    while (rec.nextDate <= today && guard++ < 24) {
      changed = true;
      const terms = Math.max(0, Math.round((new Date(inv.dueDate).getTime() - new Date(inv.issueDate).getTime()) / 86_400_000));
      const now = new Date().toISOString();
      created.push({
        ...inv,
        id: uid(),
        number: `${settings.invoicePrefix}${settings.nextInvoiceNumber}`,
        issueDate: rec.nextDate,
        dueDate: addDays(rec.nextDate, terms),
        items: inv.items.map((i) => ({ ...i, id: uid() })),
        state: 'draft',
        sentAt: undefined,
        payments: [],
        recurring: undefined,
        createdAt: now,
        updatedAt: now,
      });
      settings = { ...settings, nextInvoiceNumber: settings.nextInvoiceNumber + 1 };
      rec = { ...rec, nextDate: addInterval(rec.nextDate, rec.interval) };
    }
    return rec === inv.recurring ? inv : { ...inv, recurring: rec };
  });
  return changed ? { ...data, invoices: [...invoices, ...created], settings } : data;
}

interface Store {
  data: AppData;
  saveClient: (c: Client) => void;
  deleteClient: (id: string) => void;
  saveInvoice: (inv: Invoice) => void;
  deleteInvoice: (id: string) => void;
  newInvoice: (clientId?: string) => Invoice;
  duplicateInvoice: (id: string) => Invoice | undefined;
  addPayment: (invoiceId: string, p: Omit<Payment, 'id'>) => void;
  removePayment: (invoiceId: string, paymentId: string) => void;
  updateSettings: (s: Settings) => void;
  replaceAll: (d: AppData) => void;
  resetEmpty: () => void;
  loadDemo: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => runRecurring(load()));

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage full or unavailable */
    }
  }, [data]);

  const touch = (inv: Invoice): Invoice => ({ ...inv, updatedAt: new Date().toISOString() });

  const saveClient = useCallback((c: Client) => {
    setData((d) => {
      const exists = d.clients.some((x) => x.id === c.id);
      return { ...d, clients: exists ? d.clients.map((x) => (x.id === c.id ? c : x)) : [...d.clients, c] };
    });
  }, []);

  const deleteClient = useCallback((id: string) => {
    setData((d) => ({ ...d, clients: d.clients.filter((c) => c.id !== id), invoices: d.invoices.filter((i) => i.clientId !== id) }));
  }, []);

  const saveInvoice = useCallback((inv: Invoice) => {
    setData((d) => {
      const exists = d.invoices.some((x) => x.id === inv.id);
      let settings = d.settings;
      if (!exists && inv.number === `${settings.invoicePrefix}${settings.nextInvoiceNumber}`) {
        settings = { ...settings, nextInvoiceNumber: settings.nextInvoiceNumber + 1 };
      }
      return {
        ...d,
        settings,
        invoices: exists ? d.invoices.map((x) => (x.id === inv.id ? touch(inv) : x)) : [...d.invoices, touch(inv)],
      };
    });
  }, []);

  const deleteInvoice = useCallback((id: string) => {
    setData((d) => ({ ...d, invoices: d.invoices.filter((i) => i.id !== id) }));
  }, []);

  const newInvoice = useCallback(
    (clientId?: string): Invoice => {
      const s = data.settings;
      const client = data.clients.find((c) => c.id === clientId);
      const issueDate = todayISO();
      const now = new Date().toISOString();
      return {
        id: uid(),
        number: `${s.invoicePrefix}${s.nextInvoiceNumber}`,
        clientId: clientId ?? '',
        issueDate,
        dueDate: addDays(issueDate, s.paymentTermsDays),
        currency: client?.currency || s.currency,
        items: [{ id: uid(), description: '', quantity: 1, rate: 0 }],
        taxRate: s.taxRate,
        discountType: 'percent',
        discountValue: 0,
        notes: s.defaultNotes,
        terms: s.defaultTerms,
        state: 'draft',
        payments: [],
        createdAt: now,
        updatedAt: now,
      };
    },
    [data.settings, data.clients],
  );

  const duplicateInvoice = useCallback(
    (id: string) => {
      const src = data.invoices.find((i) => i.id === id);
      if (!src) return undefined;
      const fresh = newInvoice(src.clientId);
      const copy: Invoice = {
        ...fresh,
        currency: src.currency,
        items: src.items.map((i) => ({ ...i, id: uid() })),
        taxRate: src.taxRate,
        discountType: src.discountType,
        discountValue: src.discountValue,
        notes: src.notes,
        terms: src.terms,
      };
      saveInvoice(copy);
      return copy;
    },
    [data.invoices, newInvoice, saveInvoice],
  );

  const addPayment = useCallback((invoiceId: string, p: Omit<Payment, 'id'>) => {
    setData((d) => ({
      ...d,
      invoices: d.invoices.map((i) =>
        i.id === invoiceId
          ? touch({ ...i, state: i.state === 'draft' ? 'sent' : i.state, payments: [...i.payments, { ...p, id: uid() }] })
          : i,
      ),
    }));
  }, []);

  const removePayment = useCallback((invoiceId: string, paymentId: string) => {
    setData((d) => ({
      ...d,
      invoices: d.invoices.map((i) => (i.id === invoiceId ? touch({ ...i, payments: i.payments.filter((p) => p.id !== paymentId) }) : i)),
    }));
  }, []);

  const updateSettings = useCallback((s: Settings) => setData((d) => ({ ...d, settings: s })), []);
  const replaceAll = useCallback((d: AppData) => setData(runRecurring(d)), []);
  const resetEmpty = useCallback(() => setData(emptyData()), []);
  const loadDemo = useCallback(() => setData(runRecurring(demoData())), []);

  const value = useMemo<Store>(
    () => ({ data, saveClient, deleteClient, saveInvoice, deleteInvoice, newInvoice, duplicateInvoice, addPayment, removePayment, updateSettings, replaceAll, resetEmpty, loadDemo }),
    [data, saveClient, deleteClient, saveInvoice, deleteInvoice, newInvoice, duplicateInvoice, addPayment, removePayment, updateSettings, replaceAll, resetEmpty, loadDemo],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

/** Toast notifications. */
type Toast = { id: string; message: string };
const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string) => {
    const id = uid();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
