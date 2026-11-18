import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Mail, MapPin, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { useStore, useToast } from '../store';
import { formatDate, formatMoney, initials, invoiceStatus, invoiceTotals } from '../utils';
import { EmptyState, PageHeader, StatusBadge } from '../components/ui';
import ClientForm from '../components/ClientForm';

export default function ClientDetail() {
  const { id } = useParams();
  const { data, deleteClient } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const c = data.clients.find((x) => x.id === id);

  if (!c) {
    return (
      <div className="card pad">
        <p>That client could not be found.</p>
        <Link to="/clients" className="link">Back to clients</Link>
      </div>
    );
  }

  const invs = data.invoices.filter((i) => i.clientId === c.id).sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  let billed = 0, paid = 0, outstanding = 0;
  for (const i of invs) {
    const st = invoiceStatus(i);
    if (st === 'void' || st === 'draft') continue;
    const t = invoiceTotals(i);
    billed += t.total;
    paid += t.paid;
    outstanding += t.balance;
  }

  const createInvoice = () => navigate(`/invoices/new?client=${c.id}`);
  const remove = () => {
    const msg = invs.length ? `Delete ${c.company || c.name} and their ${invs.length} invoice(s)? This can’t be undone.` : `Delete ${c.company || c.name}?`;
    if (!confirm(msg)) return;
    deleteClient(c.id);
    toast('Client deleted');
    navigate('/clients');
  };

  return (
    <>
      <PageHeader
        back={<Link to="/clients" className="back"><ArrowLeft size={16} /> Clients</Link>}
        title={<span className="row-gap"><span className="avatar lg">{initials(c.company || c.name)}</span>{c.company || c.name}</span>}
        actions={
          <>
            <button className="btn btn-ghost btn-danger" onClick={remove}><Trash2 size={16} /> Delete</button>
            <button className="btn" onClick={() => setEditing(true)}><Pencil size={16} /> Edit</button>
            <button className="btn btn-primary" onClick={createInvoice}><Plus size={16} /> New invoice</button>
          </>
        }
      />

      <div className="kpis three">
        <div className="kpi card"><div className="kpi-head">Total billed</div><div className="kpi-value">{formatMoney(billed, c.currency)}</div></div>
        <div className="kpi card"><div className="kpi-head">Paid</div><div className="kpi-value">{formatMoney(paid, c.currency)}</div></div>
        <div className="kpi card"><div className="kpi-head">Outstanding</div><div className="kpi-value">{formatMoney(outstanding, c.currency)}</div></div>
      </div>

      <div className="detail">
        <section className="card">
          <div className="card-head"><h2>Invoices</h2></div>
          {invs.length === 0 ? (
            <EmptyState icon={<FileText size={28} />} title="No invoices yet" text={`Create the first invoice for ${c.company || c.name}.`} action={<button className="btn btn-primary" onClick={createInvoice}><Plus size={16} /> New invoice</button>} />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Invoice</th><th>Issued</th><th>Status</th><th className="num">Total</th><th className="num">Balance</th></tr></thead>
                <tbody>
                  {invs.map((i) => {
                    const t = invoiceTotals(i);
                    const st = invoiceStatus(i);
                    return (
                      <tr key={i.id} className="clickable" onClick={() => navigate(`/invoices/${i.id}`)}>
                        <td className="strong">{i.number}</td>
                        <td className="muted">{formatDate(i.issueDate)}</td>
                        <td><StatusBadge status={st} /></td>
                        <td className="num">{formatMoney(t.total, i.currency)}</td>
                        <td className="num strong">{formatMoney(st === 'void' ? 0 : t.balance, i.currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="detail-side">
          <section className="card pad">
            <h3 className="section-title">Contact</h3>
            <ul className="contact">
              {c.company && <li><span className="muted small">Contact</span>{c.name}</li>}
              {c.email && <li><Mail size={15} /><a className="link" href={`mailto:${c.email}`}>{c.email}</a></li>}
              {c.phone && <li><Phone size={15} />{c.phone}</li>}
              {c.address && <li><MapPin size={15} /><span className="pre">{c.address}</span></li>}
              <li><span className="muted small">Currency</span>{c.currency}</li>
            </ul>
          </section>
          {c.notes && (
            <section className="card pad">
              <h3 className="section-title">Notes</h3>
              <p className="pre small">{c.notes}</p>
            </section>
          )}
        </aside>
      </div>

      {editing && <ClientForm client={c} onClose={() => setEditing(false)} />}
    </>
  );
}
