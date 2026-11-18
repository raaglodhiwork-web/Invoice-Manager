import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Clock, FilePen, FileText, Plus } from 'lucide-react';
import { useStore } from '../store';
import { daysBetween, formatDate, formatMoney, invoiceStatus, invoiceTotals, parseISO, todayISO } from '../utils';
import { EmptyState, PageHeader, StatusBadge } from '../components/ui';
import type { Invoice } from '../types';

type Sums = Record<string, number>;
const add = (s: Sums, cur: string, n: number) => ((s[cur] = (s[cur] || 0) + n), s);

function MoneyStack({ sums, primary }: { sums: Sums; primary: string }) {
  const others = Object.entries(sums).filter(([c, v]) => c !== primary && v > 0);
  return (
    <>
      <div className="kpi-value">{formatMoney(sums[primary] || 0, primary)}</div>
      {others.length > 0 && <div className="kpi-sub">+ {others.map(([c, v]) => formatMoney(v, c)).join(' · ')}</div>}
    </>
  );
}

export default function Dashboard() {
  const { data } = useStore();
  const navigate = useNavigate();
  const primary = data.settings.currency;
  const today = todayISO();
  const clientName = (id: string) => {
    const c = data.clients.find((x) => x.id === id);
    return c ? c.company || c.name : 'Unknown client';
  };

  const outstanding: Sums = {};
  const overdue: Sums = {};
  const collected30: Sums = {};
  let overdueCount = 0;
  let outstandingCount = 0;
  let drafts = 0;
  const attention: { inv: Invoice; days: number; balance: number }[] = [];

  for (const inv of data.invoices) {
    const st = invoiceStatus(inv, today);
    const t = invoiceTotals(inv);
    if (st === 'draft') drafts++;
    if (st === 'sent' || st === 'partial' || st === 'overdue') {
      add(outstanding, inv.currency, t.balance);
      outstandingCount++;
      const days = daysBetween(today, inv.dueDate);
      if (st === 'overdue') {
        add(overdue, inv.currency, t.balance);
        overdueCount++;
      }
      if (days <= 7) attention.push({ inv, days, balance: t.balance });
    }
    for (const p of inv.payments) if (daysBetween(p.date, today) <= 30) add(collected30, inv.currency, p.amount);
  }
  attention.sort((a, b) => a.days - b.days);

  // Revenue collected per month, last 6 months, primary currency.
  const months: { key: string; label: string; value: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString(undefined, { month: 'short' }), value: 0 });
  }
  for (const inv of data.invoices) {
    if (inv.currency !== primary) continue;
    for (const p of inv.payments) {
      const d = parseISO(p.date);
      const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (m) m.value += p.amount;
    }
  }
  const maxVal = Math.max(...months.map((m) => m.value), 1);
  const total6 = months.reduce((s, m) => s + m.value, 0);

  const recent = [...data.invoices].sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.number.localeCompare(a.number)).slice(0, 6);

  if (data.invoices.length === 0) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="card">
          <EmptyState
            icon={<FileText size={28} />}
            title="Create your first invoice"
            text="Add a client, list your work, and send a professional invoice in under a minute."
            action={<button className="btn btn-primary" onClick={() => navigate('/invoices/new')}><Plus size={16} /> New invoice</button>}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        actions={<button className="btn btn-primary" onClick={() => navigate('/invoices/new')}><Plus size={16} /> New invoice</button>}
      />

      <div className="kpis">
        <Link to="/invoices?status=open" className="kpi card">
          <div className="kpi-head"><span className="kpi-icon blue"><Clock size={16} /></span>Outstanding</div>
          <MoneyStack sums={outstanding} primary={primary} />
          <div className="kpi-foot muted">{outstandingCount} open invoice{outstandingCount === 1 ? '' : 's'}</div>
        </Link>
        <Link to="/invoices?status=overdue" className="kpi card">
          <div className="kpi-head"><span className="kpi-icon red"><AlertCircle size={16} /></span>Overdue</div>
          <MoneyStack sums={overdue} primary={primary} />
          <div className="kpi-foot muted">{overdueCount} invoice{overdueCount === 1 ? '' : 's'} past due</div>
        </Link>
        <Link to="/invoices?status=paid" className="kpi card">
          <div className="kpi-head"><span className="kpi-icon green"><CheckCircle2 size={16} /></span>Collected (30 days)</div>
          <MoneyStack sums={collected30} primary={primary} />
          <div className="kpi-foot muted">Payments received</div>
        </Link>
        <Link to="/invoices?status=draft" className="kpi card">
          <div className="kpi-head"><span className="kpi-icon gray"><FilePen size={16} /></span>Drafts</div>
          <div className="kpi-value">{drafts}</div>
          <div className="kpi-foot muted">Ready to finish &amp; send</div>
        </Link>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Revenue collected</h2>
              <p className="muted small">Last 6 months · {primary}</p>
            </div>
            <div className="strong">{formatMoney(total6, primary)}</div>
          </div>
          <div className="chart" role="img" aria-label="Monthly revenue bar chart">
            {months.map((m) => (
              <div className="bar-col" key={m.key} title={`${m.label}: ${formatMoney(m.value, primary)}`}>
                <div className="bar-value">{m.value > 0 ? formatMoney(m.value, primary).replace(/\.\d+$/, '') : ''}</div>
                <div className="bar-track">
                  <div className="bar" style={{ height: `${(m.value / maxVal) * 100}%` }} />
                </div>
                <div className="bar-label">{m.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Needs attention</h2>
              <p className="muted small">Overdue or due within 7 days</p>
            </div>
          </div>
          {attention.length === 0 ? (
            <p className="muted pad">You're all caught up. 🎉</p>
          ) : (
            <ul className="list">
              {attention.slice(0, 6).map(({ inv, days, balance }) => (
                <li key={inv.id}>
                  <Link to={`/invoices/${inv.id}`} className="list-row">
                    <div className="min0">
                      <div className="strong truncate">{clientName(inv.clientId)}</div>
                      <div className="muted small">{inv.number} · {days < 0 ? <span className="text-red">{-days} day{days === -1 ? '' : 's'} overdue</span> : days === 0 ? 'Due today' : `Due in ${days} day${days === 1 ? '' : 's'}`}</div>
                    </div>
                    <div className="strong">{formatMoney(balance, inv.currency)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Recent invoices</h2>
          <Link to="/invoices" className="link">View all <ArrowRight size={14} /></Link>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Invoice</th><th>Client</th><th>Due</th><th>Status</th><th className="num">Amount</th></tr>
            </thead>
            <tbody>
              {recent.map((inv) => (
                <tr key={inv.id} className="clickable" onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <td className="strong">{inv.number}</td>
                  <td>{clientName(inv.clientId)}</td>
                  <td className="muted">{formatDate(inv.dueDate)}</td>
                  <td><StatusBadge status={invoiceStatus(inv, today)} /></td>
                  <td className="num strong">{formatMoney(invoiceTotals(inv).total, inv.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
