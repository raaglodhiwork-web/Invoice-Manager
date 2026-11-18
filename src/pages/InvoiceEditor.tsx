import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, GripVertical, PenLine, Plus, Trash2, UserPlus } from 'lucide-react';
import { useStore, useToast } from '../store';
import type { Invoice, LineItem, RecurringInterval } from '../types';
import { addDays, addInterval, CURRENCIES, daysBetween, formatMoney, invoiceTotals, uid } from '../utils';
import { Field, PageHeader } from '../components/ui';
import ClientForm from '../components/ClientForm';
import InvoiceDocument from '../components/InvoiceDocument';

const TERMS = [
  { label: 'On receipt', days: 0 },
  { label: 'Net 7', days: 7 },
  { label: 'Net 14', days: 14 },
  { label: 'Net 30', days: 30 },
  { label: 'Net 60', days: 60 },
];

export default function InvoiceEditor() {
  const { id } = useParams();
  const { data, newInvoice, saveInvoice } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const existing = id ? data.invoices.find((i) => i.id === id) : undefined;
  const [inv, setInv] = useState<Invoice>(() => existing ?? newInvoice(params.get('client') ?? undefined));
  const [showClientForm, setShowClientForm] = useState(false);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const [errors, setErrors] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

  const client = data.clients.find((c) => c.id === inv.clientId);
  const totals = invoiceTotals(inv);
  const money = (n: number) => formatMoney(n, inv.currency);
  const termDays = daysBetween(inv.issueDate, inv.dueDate);

  // Previously billed items, for quick re-use.
  const catalog = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of data.invoices) for (const it of i.items) if (it.description.trim()) m.set(it.description.trim(), it.rate);
    return m;
  }, [data.invoices]);

  if (id && !existing) {
    return (
      <div className="card pad">
        <p>That invoice could not be found.</p>
        <Link to="/invoices" className="link">Back to invoices</Link>
      </div>
    );
  }

  const set = <K extends keyof Invoice>(k: K, v: Invoice[K]) => setInv((x) => ({ ...x, [k]: v }));
  const setItem = (itemId: string, patch: Partial<LineItem>) =>
    setInv((x) => ({ ...x, items: x.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }));
  const addItem = () => setInv((x) => ({ ...x, items: [...x.items, { id: uid(), description: '', quantity: 1, rate: 0 }] }));
  const removeItem = (itemId: string) =>
    setInv((x) => ({ ...x, items: x.items.length > 1 ? x.items.filter((i) => i.id !== itemId) : [{ id: uid(), description: '', quantity: 1, rate: 0 }] }));
  const moveItem = (from: string, to: string) =>
    setInv((x) => {
      const items = [...x.items];
      const a = items.findIndex((i) => i.id === from);
      const b = items.findIndex((i) => i.id === to);
      if (a < 0 || b < 0) return x;
      const [m] = items.splice(a, 1);
      items.splice(b, 0, m);
      return { ...x, items };
    });

  const pickClient = (clientId: string) => {
    const c = data.clients.find((x) => x.id === clientId);
    setInv((x) => ({ ...x, clientId, currency: !existing && c?.currency ? c.currency : x.currency }));
  };

  const validate = () => {
    const e: string[] = [];
    if (!inv.clientId) e.push('Choose a client.');
    if (!inv.number.trim()) e.push('Add an invoice number.');
    if (data.invoices.some((i) => i.number === inv.number.trim() && i.id !== inv.id)) e.push(`Invoice number ${inv.number} is already used.`);
    if (!inv.items.some((i) => i.description.trim())) e.push('Add at least one line item.');
    if (inv.dueDate < inv.issueDate) e.push('Due date can’t be before the issue date.');
    setErrors(e);
    return e.length === 0;
  };

  const save = (markSent: boolean) => {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const cleaned: Invoice = {
      ...inv,
      number: inv.number.trim(),
      items: inv.items.filter((i) => i.description.trim() || i.rate),
      state: markSent && inv.state === 'draft' ? 'sent' : inv.state,
      sentAt: markSent && inv.state === 'draft' ? new Date().toISOString().slice(0, 10) : inv.sentAt,
    };
    saveInvoice(cleaned);
    toast(markSent ? 'Invoice saved and marked as sent' : existing ? 'Changes saved' : 'Draft saved');
    navigate(`/invoices/${cleaned.id}`, { replace: true });
  };

  const setRecurring = (interval: RecurringInterval | '') =>
    set('recurring', interval ? { interval, nextDate: addInterval(inv.issueDate, interval) } : undefined);

  return (
    <>
      <PageHeader
        back={<Link to={existing ? `/invoices/${existing.id}` : '/invoices'} className="back"><ArrowLeft size={16} /> {existing ? existing.number : 'Invoices'}</Link>}
        title={existing ? `Edit ${existing.number}` : 'New invoice'}
        actions={
          <>
            <button className="btn" onClick={() => navigate(-1)}>Cancel</button>
            {inv.state === 'draft' && <button className="btn" onClick={() => save(false)}>Save draft</button>}
            <button className="btn btn-primary" onClick={() => save(inv.state === 'draft')}>{inv.state === 'draft' ? 'Save & mark sent' : 'Save changes'}</button>
          </>
        }
      />

      <div className="seg mobile-only">
        <button className={mobileTab === 'edit' ? 'active' : ''} onClick={() => setMobileTab('edit')}><PenLine size={14} /> Edit</button>
        <button className={mobileTab === 'preview' ? 'active' : ''} onClick={() => setMobileTab('preview')}><Eye size={14} /> Preview</button>
      </div>

      {errors.length > 0 && (
        <div className="alert alert-error">
          <strong>Please fix the following:</strong>
          <ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <div className="editor">
        <div className={`editor-form ${mobileTab === 'preview' ? 'hide-mobile' : ''}`}>
          <section className="card pad">
            <h2 className="section-title">Bill to</h2>
            <div className="row-gap">
              <select className="grow" value={inv.clientId} onChange={(e) => pickClient(e.target.value)} aria-label="Client">
                <option value="">Select a client…</option>
                {[...data.clients].sort((a, b) => (a.company || a.name).localeCompare(b.company || b.name)).map((c) => (
                  <option key={c.id} value={c.id}>{c.company ? `${c.company} — ${c.name}` : c.name}</option>
                ))}
              </select>
              <button className="btn" onClick={() => setShowClientForm(true)}><UserPlus size={16} /> New client</button>
            </div>
            {client && (
              <p className="muted small mt8 pre">{[client.email, client.address.replace(/\n/g, ', ')].filter(Boolean).join(' · ')}</p>
            )}
          </section>

          <section className="card pad">
            <h2 className="section-title">Details</h2>
            <div className="form-grid">
              <Field label="Invoice number">
                <input value={inv.number} onChange={(e) => set('number', e.target.value)} />
              </Field>
              <Field label="Currency">
                <select value={inv.currency} onChange={(e) => set('currency', e.target.value)}>
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Issue date">
                <input type="date" value={inv.issueDate} onChange={(e) => setInv((x) => ({ ...x, issueDate: e.target.value, dueDate: addDays(e.target.value, Math.max(termDays, 0)) }))} />
              </Field>
              <Field label="Due date">
                <input type="date" value={inv.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
              </Field>
              <div className="span-2 chips">
                {TERMS.map((t) => (
                  <button key={t.label} type="button" className={`chip ${termDays === t.days ? 'active' : ''}`} onClick={() => set('dueDate', addDays(inv.issueDate, t.days))}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="card pad">
            <h2 className="section-title">Line items</h2>
            <datalist id="catalog">
              {[...catalog.keys()].map((d) => <option key={d} value={d} />)}
            </datalist>
            <div className="items">
              <div className="items-head">
                <span />
                <span>Description</span>
                <span className="num">Qty</span>
                <span className="num">Rate</span>
                <span className="num">Amount</span>
                <span />
              </div>
              {inv.items.map((it) => (
                <div
                  key={it.id}
                  className={`item-row ${dragId === it.id ? 'dragging' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); if (dragId && dragId !== it.id) moveItem(dragId, it.id); }}
                >
                  <span className="drag" draggable onDragStart={() => setDragId(it.id)} onDragEnd={() => setDragId(null)} title="Drag to reorder">
                    <GripVertical size={16} />
                  </span>
                  <input
                    className="item-desc"
                    list="catalog"
                    placeholder="Description of work or product"
                    value={it.description}
                    aria-label="Description"
                    onChange={(e) => {
                      const v = e.target.value;
                      const known = catalog.get(v.trim());
                      setItem(it.id, known !== undefined && !it.rate ? { description: v, rate: known } : { description: v });
                    }}
                  />
                  <input className="num" type="number" min="0" step="any" value={it.quantity} aria-label="Quantity" onChange={(e) => setItem(it.id, { quantity: Number(e.target.value) })} />
                  <input className="num" type="number" min="0" step="0.01" value={it.rate} aria-label="Rate" onChange={(e) => setItem(it.id, { rate: Number(e.target.value) })} />
                  <span className="num item-amount">{money(it.quantity * it.rate)}</span>
                  <button className="icon-btn" onClick={() => removeItem(it.id)} aria-label="Remove item"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost mt8" onClick={addItem}><Plus size={16} /> Add line item</button>

            <div className="totals-editor">
              <div className="row"><span className="muted">Subtotal</span><span>{money(totals.subtotal)}</span></div>
              <div className="row">
                <span className="muted">Discount</span>
                <span className="row-gap">
                  <input className="num sm" type="number" min="0" step="any" value={inv.discountValue} onChange={(e) => set('discountValue', Number(e.target.value))} aria-label="Discount" />
                  <select className="sm" value={inv.discountType} onChange={(e) => set('discountType', e.target.value as Invoice['discountType'])} aria-label="Discount type">
                    <option value="percent">%</option>
                    <option value="amount">{inv.currency}</option>
                  </select>
                </span>
              </div>
              <div className="row">
                <span className="muted">Tax rate</span>
                <span className="row-gap">
                  <input className="num sm" type="number" min="0" step="any" value={inv.taxRate} onChange={(e) => set('taxRate', Number(e.target.value))} aria-label="Tax rate" />
                  <span className="muted">%</span>
                </span>
              </div>
              <div className="row total"><span>Total</span><span>{money(totals.total)}</span></div>
            </div>
          </section>

          <section className="card pad">
            <h2 className="section-title">Notes &amp; terms</h2>
            <div className="form-grid">
              <Field label="Notes to client" className="span-2">
                <textarea rows={2} value={inv.notes} onChange={(e) => set('notes', e.target.value)} />
              </Field>
              <Field label="Terms" className="span-2">
                <textarea rows={2} value={inv.terms} onChange={(e) => set('terms', e.target.value)} />
              </Field>
            </div>
          </section>

          <section className="card pad">
            <h2 className="section-title">Recurring</h2>
            <p className="muted small mb12">Automatically create a new draft of this invoice on a schedule — handy for retainers and subscriptions.</p>
            <div className="chips">
              {(['', 'weekly', 'monthly', 'quarterly', 'yearly'] as const).map((r) => (
                <button key={r || 'none'} type="button" className={`chip ${(inv.recurring?.interval ?? '') === r ? 'active' : ''}`} onClick={() => setRecurring(r)}>
                  {r ? r[0].toUpperCase() + r.slice(1) : 'Off'}
                </button>
              ))}
            </div>
            {inv.recurring && (
              <Field label="Next invoice date" className="mt12">
                <input type="date" value={inv.recurring.nextDate} onChange={(e) => set('recurring', { ...inv.recurring!, nextDate: e.target.value })} />
              </Field>
            )}
          </section>
        </div>

        <aside className={`editor-preview ${mobileTab === 'edit' ? 'hide-mobile' : ''}`}>
          <div className="preview-label muted small">Live preview</div>
          <div className="preview-scale">
            <InvoiceDocument invoice={inv} client={client} settings={data.settings} />
          </div>
        </aside>
      </div>

      {showClientForm && <ClientForm onClose={() => setShowClientForm(false)} onSaved={(c) => pickClient(c.id)} />}
    </>
  );
}
