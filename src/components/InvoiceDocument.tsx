import type { Client, Invoice, Settings } from '../types';
import { formatDate, formatMoney, invoiceStatus, invoiceTotals } from '../utils';

/** The printable invoice itself — used for the live preview, detail view, and PDF/print output. */
export default function InvoiceDocument({ invoice, client, settings }: { invoice: Invoice; client?: Client; settings: Settings }) {
  const t = invoiceTotals(invoice);
  const money = (n: number) => formatMoney(n, invoice.currency);
  const biz = settings.business;
  const status = invoiceStatus(invoice);
  const accent = settings.accentColor || '#4f46e5';

  return (
    <article className="doc" style={{ ['--doc-accent' as string]: accent }}>
      {status === 'paid' && <div className="doc-stamp">Paid</div>}
      <header className="doc-head">
        <div>
          {biz.logo ? <img className="doc-logo" src={biz.logo} alt={biz.name} /> : <div className="doc-bizname">{biz.name}</div>}
          <div className="doc-small pre">
            {[biz.logo ? biz.name : '', biz.address, biz.email, biz.phone, biz.website, biz.taxId && `Tax ID: ${biz.taxId}`].filter(Boolean).join('\n')}
          </div>
        </div>
        <div className="doc-title">
          <div className="doc-h">Invoice</div>
          <div className="doc-num">{invoice.number}</div>
        </div>
      </header>

      <section className="doc-meta">
        <div>
          <div className="doc-label">Bill to</div>
          {client ? (
            <div className="doc-small pre">
              <strong className="doc-strong">{client.company || client.name}</strong>
              {'\n'}
              {[client.company ? client.name : '', client.address, client.email].filter(Boolean).join('\n')}
            </div>
          ) : (
            <div className="doc-small doc-placeholder">Select a client</div>
          )}
        </div>
        <dl className="doc-dates">
          <dt>Issue date</dt>
          <dd>{formatDate(invoice.issueDate)}</dd>
          <dt>Due date</dt>
          <dd>{formatDate(invoice.dueDate)}</dd>
          <dt>Amount due</dt>
          <dd className="doc-strong">{money(t.balance)}</dd>
        </dl>
      </section>

      <table className="doc-table">
        <thead>
          <tr>
            <th>Description</th>
            <th className="num">Qty</th>
            <th className="num">Rate</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.filter((i) => i.description || i.rate).map((i) => (
            <tr key={i.id}>
              <td className="pre">{i.description || <span className="doc-placeholder">Item</span>}</td>
              <td className="num">{i.quantity}</td>
              <td className="num">{money(i.rate)}</td>
              <td className="num">{money(i.quantity * i.rate)}</td>
            </tr>
          ))}
          {!invoice.items.some((i) => i.description || i.rate) && (
            <tr>
              <td colSpan={4} className="doc-placeholder">Add line items to see them here</td>
            </tr>
          )}
        </tbody>
      </table>

      <section className="doc-totals">
        <div className="row"><span>Subtotal</span><span>{money(t.subtotal)}</span></div>
        {t.discount > 0 && (
          <div className="row"><span>Discount{invoice.discountType === 'percent' ? ` (${invoice.discountValue}%)` : ''}</span><span>−{money(t.discount)}</span></div>
        )}
        {invoice.taxRate > 0 && <div className="row"><span>Tax ({invoice.taxRate}%)</span><span>{money(t.tax)}</span></div>}
        <div className="row total"><span>Total</span><span>{money(t.total)}</span></div>
        {t.paid > 0 && <div className="row"><span>Paid</span><span>−{money(t.paid)}</span></div>}
        {t.paid > 0 && <div className="row due"><span>Balance due</span><span>{money(t.balance)}</span></div>}
      </section>

      {(invoice.notes || invoice.terms || settings.paymentInstructions) && (
        <footer className="doc-foot">
          {settings.paymentInstructions && (
            <div>
              <div className="doc-label">Payment details</div>
              <p className="doc-small pre">{settings.paymentInstructions}</p>
            </div>
          )}
          {invoice.notes && (
            <div>
              <div className="doc-label">Notes</div>
              <p className="doc-small pre">{invoice.notes}</p>
            </div>
          )}
          {invoice.terms && (
            <div>
              <div className="doc-label">Terms</div>
              <p className="doc-small pre">{invoice.terms}</p>
            </div>
          )}
        </footer>
      )}
    </article>
  );
}
