import type { AppData, Client, Invoice, Settings } from './types';
import { addDays, todayISO, uid } from './utils';

export const defaultSettings: Settings = {
  business: {
    name: 'Your Business',
    email: 'billing@yourbusiness.com',
    phone: '',
    address: '',
    taxId: '',
    website: '',
    logo: '',
  },
  currency: 'USD',
  taxRate: 0,
  paymentTermsDays: 14,
  invoicePrefix: 'INV-',
  nextInvoiceNumber: 1001,
  defaultNotes: 'Thank you for your business!',
  defaultTerms: 'Payment is due within the stated terms. Late payments may incur a 1.5% monthly fee.',
  paymentInstructions: 'Bank transfer: Account 000000000 · Routing 000000000',
  accentColor: '#4f46e5',
};

export function emptyData(): AppData {
  return { version: 1, clients: [], invoices: [], settings: { ...defaultSettings } };
}

/** Realistic sample data so the dashboard is meaningful on first launch. */
export function demoData(): AppData {
  const t = todayISO();
  const now = new Date().toISOString();
  const mk = (c: Omit<Client, 'id' | 'createdAt' | 'notes' | 'currency'> & { currency?: string }): Client => ({
    id: uid(),
    createdAt: now,
    notes: '',
    currency: c.currency ?? 'USD',
    ...c,
  });
  const clients: Client[] = [
    mk({ name: 'Sarah Chen', company: 'Northwind Studio', email: 'sarah@northwind.co', phone: '+1 415 555 0142', address: '88 Market St\nSan Francisco, CA 94105' }),
    mk({ name: 'James Okafor', company: 'Brightline Labs', email: 'ap@brightline.io', phone: '+1 212 555 0198', address: '200 Park Ave\nNew York, NY 10166' }),
    mk({ name: 'Elena Rossi', company: 'Atelier Verde', email: 'elena@atelierverde.it', phone: '', address: 'Via Roma 12\n20121 Milano, Italy', currency: 'EUR' }),
    mk({ name: 'Marcus Webb', company: 'Summit Outdoor Co.', email: 'marcus@summitoutdoor.com', phone: '+1 303 555 0110', address: '1550 Blake St\nDenver, CO 80202' }),
  ];

  let n = 1001;
  const inv = (
    client: Client,
    issueOffset: number,
    terms: number,
    items: [string, number, number][],
    opts: Partial<Invoice> & { paidFull?: boolean; paidPart?: number } = {},
  ): Invoice => {
    const issueDate = addDays(t, issueOffset);
    const base: Invoice = {
      id: uid(),
      number: `INV-${n++}`,
      clientId: client.id,
      issueDate,
      dueDate: addDays(issueDate, terms),
      currency: client.currency,
      items: items.map(([description, quantity, rate]) => ({ id: uid(), description, quantity, rate })),
      taxRate: 8,
      discountType: 'percent',
      discountValue: 0,
      notes: defaultSettings.defaultNotes,
      terms: defaultSettings.defaultTerms,
      state: 'sent',
      sentAt: issueDate,
      payments: [],
      createdAt: now,
      updatedAt: now,
      ...opts,
    };
    const subtotal = base.items.reduce((s, i) => s + i.quantity * i.rate, 0);
    const total = Math.round(subtotal * (1 + base.taxRate / 100) * 100) / 100;
    if (opts.paidFull) base.payments = [{ id: uid(), date: addDays(issueDate, Math.min(terms, 9)), amount: total, method: 'Bank transfer', note: '' }];
    if (opts.paidPart) base.payments = [{ id: uid(), date: addDays(issueDate, 5), amount: opts.paidPart, method: 'Card', note: 'Deposit' }];
    return base;
  };

  const [a, b, c, d] = clients;
  const invoices: Invoice[] = [
    inv(a, -170, 14, [['Brand identity design', 1, 4200], ['Logo revisions', 6, 95]], { paidFull: true }),
    inv(b, -150, 30, [['Web app development — Sprint 1', 80, 120]], { paidFull: true }),
    inv(c, -125, 30, [['Product photography', 2, 850]], { paidFull: true, taxRate: 22 }),
    inv(d, -110, 14, [['Campaign landing page', 1, 3200]], { paidFull: true }),
    inv(b, -95, 30, [['Web app development — Sprint 2', 76, 120]], { paidFull: true }),
    inv(a, -70, 14, [['Website copywriting', 12, 110], ['SEO audit', 1, 900]], { paidFull: true }),
    inv(b, -60, 30, [['Web app development — Sprint 3', 84, 120]], { paidFull: true }),
    inv(d, -45, 14, [['Social media kit', 1, 1800], ['Stock image licensing', 10, 25]], { paidFull: true }),
    inv(c, -40, 30, [['Lookbook layout', 1, 2400]], { paidFull: true, taxRate: 22 }),
    inv(b, -32, 30, [['Web app development — Sprint 4', 90, 120]], { paidPart: 5000 }),
    inv(d, -28, 14, [['Retainer — Marketing support', 1, 2500]], { recurring: { interval: 'monthly', nextDate: addDays(t, 3) } }),
    inv(a, -12, 14, [['Packaging design', 1, 3600], ['Print-ready files', 1, 450]]),
    inv(c, -6, 30, [['Spring collection shoot', 1, 3100]], { taxRate: 22, paidFull: false }),
    inv(b, -1, 30, [['UX research interviews', 8, 175]], { state: 'draft', sentAt: undefined }),
  ];

  return {
    version: 1,
    clients,
    invoices,
    settings: { ...defaultSettings, business: { ...defaultSettings.business, name: 'Studio Ledgerly', email: 'hello@ledgerly.studio', address: '500 Howard St\nSan Francisco, CA 94105', phone: '+1 415 555 0100', website: 'ledgerly.studio' }, nextInvoiceNumber: n, taxRate: 8 },
  };
}
