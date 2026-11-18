import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Download, FileText, Plus, Repeat, Search } from 'lucide-react';
import { useStore } from '../store';
import { isEmbedded, downloadFile, formatDate, formatMoney, invoiceStatus, invoiceTotals, STATUS_LABEL, toCSV, todayISO } from '../utils';
import { EmptyState, PageHeader, StatusBadge } from '../components/ui';
import type { InvoiceStatus } from '../types';

const TABS: { key: string; label: string; match: (s: InvoiceStatus) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'draft', label: 'Drafts', match: (s) => s === 'draft' },
  { key: 'open', label: 'Unpaid', match: (s) => s === 'sent' || s === 'partial' || s === 'overdue' },
  { key: 'overdue', label: 'Overdue', match: (s) => s === 'overdue' },
  { key: 'paid', label: 'Paid', match: (s) => s === 'paid' },
];

type SortKey = 'number' | 'client' | 'issueDate' | 'dueDate' | 'total' | 'balance';

export default function Invoices() {
  const { data } = useStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('status') || 'all';
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'issueDate', dir: -1 });
  const today = todayISO();

  const rows = useMemo(() => {
    return data.invoices.map((inv) => {
      const c = data.clients.find((x) => x.id === inv.clientId);
      return { inv, client: c ? c.company || c.name : '—', status: invoiceStatus(inv, today), totals: invoiceTotals(inv) };
    });
  }, [data, today]);

  const counts = Object.fromEntries(TABS.map((t) => [t.key, rows.filter((r) => t.match(r.status)).length]));
  const tabDef = TABS.find((t) => t.key === tab) ?? TABS[0];

  const visible = rows
    .filter((r) => tabDef.match(r.status))
    .filter((r) => {
      if (!q) return true;
      const s = q.toLowerCase();
      return r.inv.number.toLowerCase().includes(s) || r.client.toLowerCase().includes(s) || r.inv.items.some((i) => i.description.toLowerCase().includes(s));
    })
    .sort((a, b) => {
      const v = (r: typeof a): string | number => {
        switch (sort.key) {
          case 'number': return r.inv.number;
          case 'client': return r.client.toLowerCase();
          case 'issueDate': return r.inv.issueDate;
          case 'dueDate': return r.inv.dueDate;
          case 'total': return r.totals.total;
          case 'balance': return r.totals.balance;
        }
      };
      const x = v(a), y = v(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });

  const header = (key: SortKey, label: string, num = false) => (
    <th className={num ? 'num' : ''}>
      <button className="th-sort" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : key === 'client' || key === 'number' ? 1 : -1 }))}>
        {label}
        {sort.key === key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );

  const exportCSV = () => {
    const csv = toCSV([
      ['Number', 'Client', 'Issue date', 'Due date', 'Status', 'Currency', 'Subtotal', 'Tax', 'Total', 'Paid', 'Balance'],
      ...visible.map((r) => [r.inv.number, r.client, r.inv.issueDate, r.inv.dueDate, STATUS_LABEL[r.status], r.inv.currency, r.totals.subtotal, r.totals.tax, r.totals.total, r.totals.paid, r.totals.balance]),
    ]);
    downloadFile(`invoices-${today}.csv`, csv, 'text/csv');
  };

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle={`${data.invoices.length} total`}
        actions={
          <>
            {!isEmbedded && <button className="btn" onClick={exportCSV} disabled={!visible.length}><Download size={16} /> Export CSV</button>}
            <button className="btn btn-primary" onClick={() => navigate('/invoices/new')}><Plus size={16} /> New invoice</button>
          </>
        }
      />

      <div className="card">
        <div className="toolbar">
          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                className={`tab ${tab === t.key ? 'active' : ''}`}
                onClick={() => setParams(t.key === 'all' ? {} : { status: t.key })}
              >
                {t.label}
                <span className="tab-count">{counts[t.key]}</span>
              </button>
            ))}
          </div>
          <div className="search">
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search number, client, item…" aria-label="Search invoices" />
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={<FileText size={28} />}
            title={data.invoices.length ? 'No matching invoices' : 'No invoices yet'}
            text={data.invoices.length ? 'Try a different filter or search term.' : 'Create your first invoice to start getting paid.'}
            action={!data.invoices.length && <button className="btn btn-primary" onClick={() => navigate('/invoices/new')}><Plus size={16} /> New invoice</button>}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {header('number', 'Invoice')}
                  {header('client', 'Client')}
                  {header('issueDate', 'Issued')}
                  {header('dueDate', 'Due')}
                  <th>Status</th>
                  {header('total', 'Total', true)}
                  {header('balance', 'Balance', true)}
                </tr>
              </thead>
              <tbody>
                {visible.map(({ inv, client, status, totals }) => (
                  <tr key={inv.id} className="clickable" onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <td className="strong">
                      {inv.number}
                      {inv.recurring && <Repeat size={13} className="inline-icon muted" aria-label="Recurring" />}
                    </td>
                    <td>{client}</td>
                    <td className="muted">{formatDate(inv.issueDate)}</td>
                    <td className={status === 'overdue' ? 'text-red' : 'muted'}>{formatDate(inv.dueDate)}</td>
                    <td><StatusBadge status={status} /></td>
                    <td className="num">{formatMoney(totals.total, inv.currency)}</td>
                    <td className="num strong">{formatMoney(status === 'void' ? 0 : totals.balance, inv.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
