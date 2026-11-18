import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users } from 'lucide-react';
import { useStore } from '../store';
import { formatMoney, initials, invoiceStatus, invoiceTotals } from '../utils';
import { EmptyState, PageHeader } from '../components/ui';
import ClientForm from '../components/ClientForm';

export default function Clients() {
  const { data } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);

  const rows = data.clients
    .map((c) => {
      const invs = data.invoices.filter((i) => i.clientId === c.id);
      let billed = 0, outstanding = 0, overdue = 0;
      for (const i of invs) {
        const st = invoiceStatus(i);
        if (st === 'void' || st === 'draft') continue;
        const t = invoiceTotals(i);
        billed += t.total;
        outstanding += t.balance;
        if (st === 'overdue') overdue++;
      }
      return { c, count: invs.length, billed, outstanding, overdue };
    })
    .filter(({ c }) => {
      const s = q.toLowerCase();
      return !s || [c.name, c.company, c.email].some((x) => x.toLowerCase().includes(s));
    })
    .sort((a, b) => (a.c.company || a.c.name).localeCompare(b.c.company || b.c.name));

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${data.clients.length} total`}
        actions={<button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> New client</button>}
      />
      <div className="card">
        <div className="toolbar">
          <div className="search grow">
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients…" aria-label="Search clients" />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={<Users size={28} />}
            title={data.clients.length ? 'No matching clients' : 'No clients yet'}
            text={data.clients.length ? 'Try a different search.' : 'Add the people and companies you bill.'}
            action={!data.clients.length && <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> New client</button>}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Client</th><th>Email</th><th className="num">Invoices</th><th className="num">Billed</th><th className="num">Outstanding</th></tr>
              </thead>
              <tbody>
                {rows.map(({ c, count, billed, outstanding, overdue }) => (
                  <tr key={c.id} className="clickable" onClick={() => navigate(`/clients/${c.id}`)}>
                    <td>
                      <div className="row-gap">
                        <div className="avatar">{initials(c.company || c.name)}</div>
                        <div className="min0">
                          <div className="strong truncate">{c.company || c.name}</div>
                          {c.company && <div className="muted small truncate">{c.name}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="muted">{c.email || '—'}</td>
                    <td className="num">{count}</td>
                    <td className="num">{formatMoney(billed, c.currency)}</td>
                    <td className="num">
                      <span className="strong">{formatMoney(outstanding, c.currency)}</span>
                      {overdue > 0 && <div className="text-red small">{overdue} overdue</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {adding && <ClientForm onClose={() => setAdding(false)} onSaved={(c) => navigate(`/clients/${c.id}`)} />}
    </>
  );
}
