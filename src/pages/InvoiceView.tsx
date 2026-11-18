import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, BellRing, Copy, CreditCard, Download, Mail, Pencil, Printer, Repeat, Send, Trash2, Undo2, X } from 'lucide-react';
import { useStore, useToast } from '../store';
import { daysBetween, formatDate, formatMoney, invoiceStatus, invoiceTotals, todayISO } from '../utils';
import { PageHeader, StatusBadge } from '../components/ui';
import InvoiceDocument from '../components/InvoiceDocument';
import PaymentForm from '../components/PaymentForm';

export default function InvoiceView() {
  const { id } = useParams();
  const { data, saveInvoice, deleteInvoice, duplicateInvoice, removePayment } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [paying, setPaying] = useState(false);
  const inv = data.invoices.find((i) => i.id === id);

  if (!inv) {
    return (
      <div className="card pad">
        <p>That invoice could not be found.</p>
        <Link to="/invoices" className="link">Back to invoices</Link>
      </div>
    );
  }

  const client = data.clients.find((c) => c.id === inv.clientId);
  const status = invoiceStatus(inv);
  const t = invoiceTotals(inv);
  const money = (n: number) => formatMoney(n, inv.currency);
  const biz = data.settings.business;
  const today = todayISO();
  const daysToDue = daysBetween(today, inv.dueDate);

  const mailto = (subject: string, body: string) =>
    `mailto:${encodeURIComponent(client?.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const greeting = `Hi ${client?.name?.split(' ')[0] || 'there'},`;
  const sendEmail = mailto(
    `Invoice ${inv.number} from ${biz.name}`,
    `${greeting}\n\nPlease find attached invoice ${inv.number} for ${money(t.total)}, due ${formatDate(inv.dueDate)}.\n\n${data.settings.paymentInstructions ? `Payment details:\n${data.settings.paymentInstructions}\n\n` : ''}Thank you!\n${biz.name}`,
  );
  const reminderEmail = mailto(
    `Reminder: Invoice ${inv.number} ${status === 'overdue' ? 'is overdue' : `is due ${formatDate(inv.dueDate)}`}`,
    `${greeting}\n\nThis is a friendly reminder that invoice ${inv.number} has a balance of ${money(t.balance)}${status === 'overdue' ? `, which was due on ${formatDate(inv.dueDate)}` : `, due on ${formatDate(inv.dueDate)}`}.\n\n${data.settings.paymentInstructions ? `Payment details:\n${data.settings.paymentInstructions}\n\n` : ''}If you've already sent payment, please disregard this note. Thank you!\n${biz.name}`,
  );

  const markSent = () => {
    saveInvoice({ ...inv, state: 'sent', sentAt: today });
    toast('Marked as sent');
  };
  const revertDraft = () => {
    saveInvoice({ ...inv, state: 'draft', sentAt: undefined });
    toast('Moved back to draft');
  };
  const toggleVoid = () => {
    if (inv.state !== 'void' && !confirm(`Void ${inv.number}? It will no longer count toward outstanding totals.`)) return;
    saveInvoice({ ...inv, state: inv.state === 'void' ? 'sent' : 'void' });
    toast(inv.state === 'void' ? 'Invoice restored' : 'Invoice voided');
  };
  const remove = () => {
    if (!confirm(`Delete ${inv.number} permanently? This can’t be undone.`)) return;
    deleteInvoice(inv.id);
    toast('Invoice deleted');
    navigate('/invoices');
  };
  const duplicate = () => {
    const copy = duplicateInvoice(inv.id);
    if (copy) {
      toast(`Created ${copy.number}`);
      navigate(`/invoices/${copy.id}/edit`);
    }
  };
  const print = () => {
    const prev = document.title;
    document.title = `${inv.number} - ${client?.company || client?.name || 'Invoice'}`;
    window.print();
    document.title = prev;
  };

  // Activity timeline
  const events = [
    { date: inv.createdAt.slice(0, 10), label: 'Invoice created' },
    ...(inv.sentAt ? [{ date: inv.sentAt, label: 'Marked as sent' }] : []),
    ...inv.payments.map((p) => ({ date: p.date, label: `Payment of ${money(p.amount)} received` })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <PageHeader
        back={<Link to="/invoices" className="back"><ArrowLeft size={16} /> Invoices</Link>}
        title={<span className="row-gap">{inv.number} <StatusBadge status={status} /></span>}
        subtitle={client ? <Link to={`/clients/${client.id}`} className="link">{client.company || client.name}</Link> : 'No client'}
        actions={
          <>
            <button className="btn" onClick={print}><Download size={16} /> PDF</button>
            {inv.state !== 'void' && <Link to={`/invoices/${inv.id}/edit`} className="btn"><Pencil size={16} /> Edit</Link>}
            {status === 'draft' && <button className="btn btn-primary" onClick={markSent}><Send size={16} /> Mark as sent</button>}
            {['sent', 'partial', 'overdue'].includes(status) && (
              <button className="btn btn-primary" onClick={() => setPaying(true)}><CreditCard size={16} /> Record payment</button>
            )}
          </>
        }
      />

      <div className="detail">
        <div className="detail-doc print-area">
          <InvoiceDocument invoice={inv} client={client} settings={data.settings} />
        </div>

        <aside className="detail-side">
          <section className="card pad">
            <div className="summary-amount">
              <div className="muted small">{status === 'paid' ? 'Paid in full' : 'Balance due'}</div>
              <div className="big">{money(status === 'paid' ? t.total : t.balance)}</div>
              {['sent', 'partial', 'overdue'].includes(status) && (
                <div className={`small ${status === 'overdue' ? 'text-red' : 'muted'}`}>
                  {daysToDue < 0 ? `${-daysToDue} day${daysToDue === -1 ? '' : 's'} overdue` : daysToDue === 0 ? 'Due today' : `Due in ${daysToDue} day${daysToDue === 1 ? '' : 's'}`}
                </div>
              )}
            </div>
            {t.total > 0 && status !== 'draft' && status !== 'void' && (
              <div className="progress" aria-label={`${Math.round((t.paid / t.total) * 100)}% paid`}>
                <div style={{ width: `${Math.min(100, (t.paid / t.total) * 100)}%` }} />
              </div>
            )}
            <dl className="kv">
              <dt>Total</dt><dd>{money(t.total)}</dd>
              <dt>Paid</dt><dd>{money(t.paid)}</dd>
              <dt>Issued</dt><dd>{formatDate(inv.issueDate)}</dd>
              <dt>Due</dt><dd>{formatDate(inv.dueDate)}</dd>
              {inv.recurring && (<><dt>Repeats</dt><dd className="row-gap"><Repeat size={13} /> {inv.recurring.interval}, next {formatDate(inv.recurring.nextDate)}</dd></>)}
            </dl>
          </section>

          <section className="card pad">
            <h3 className="section-title">Send to client</h3>
            <div className="stack">
              <a className="btn btn-block" href={sendEmail} onClick={() => status === 'draft' && markSent()}><Mail size={16} /> Email invoice</a>
              {['sent', 'partial', 'overdue'].includes(status) && (
                <a className="btn btn-block" href={reminderEmail}><BellRing size={16} /> Send payment reminder</a>
              )}
              <button className="btn btn-block" onClick={print}><Printer size={16} /> Print / Save as PDF</button>
            </div>
            {!client?.email && <p className="muted small mt8">Tip: add an email to this client to pre-fill the recipient.</p>}
          </section>

          {inv.payments.length > 0 && (
            <section className="card pad">
              <h3 className="section-title">Payments</h3>
              <ul className="list compact">
                {inv.payments.map((p) => (
                  <li key={p.id} className="list-row">
                    <div>
                      <div className="strong">{money(p.amount)}</div>
                      <div className="muted small">{formatDate(p.date)} · {p.method}{p.note ? ` · ${p.note}` : ''}</div>
                    </div>
                    <button className="icon-btn" aria-label="Remove payment" onClick={() => { if (confirm('Remove this payment?')) { removePayment(inv.id, p.id); toast('Payment removed'); } }}>
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card pad">
            <h3 className="section-title">Activity</h3>
            <ol className="timeline">
              {events.map((e, i) => (
                <li key={i}><span className="dot" /><div><div>{e.label}</div><div className="muted small">{formatDate(e.date)}</div></div></li>
              ))}
            </ol>
          </section>

          <section className="card pad">
            <h3 className="section-title">More actions</h3>
            <div className="stack">
              <button className="btn btn-block btn-ghost justify-start" onClick={duplicate}><Copy size={16} /> Duplicate</button>
              {status !== 'draft' && inv.payments.length === 0 && inv.state !== 'void' && (
                <button className="btn btn-block btn-ghost justify-start" onClick={revertDraft}><Undo2 size={16} /> Revert to draft</button>
              )}
              {inv.state !== 'draft' && (
                <button className="btn btn-block btn-ghost justify-start" onClick={toggleVoid}><Ban size={16} /> {inv.state === 'void' ? 'Restore invoice' : 'Void invoice'}</button>
              )}
              <button className="btn btn-block btn-ghost btn-danger justify-start" onClick={remove}><Trash2 size={16} /> Delete</button>
            </div>
          </section>
        </aside>
      </div>

      {paying && <PaymentForm invoice={inv} onClose={() => setPaying(false)} />}
    </>
  );
}
