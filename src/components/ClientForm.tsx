import { useState } from 'react';
import type { Client } from '../types';
import { useStore, useToast } from '../store';
import { CURRENCIES, uid } from '../utils';
import { Field, Modal } from './ui';

export default function ClientForm({ client, onClose, onSaved }: { client?: Client; onClose: () => void; onSaved?: (c: Client) => void }) {
  const { data, saveClient } = useStore();
  const toast = useToast();
  const [c, setC] = useState<Client>(
    client ?? {
      id: uid(),
      name: '',
      company: '',
      email: '',
      phone: '',
      address: '',
      currency: data.settings.currency,
      notes: '',
      createdAt: new Date().toISOString(),
    },
  );
  const [error, setError] = useState('');
  const set = <K extends keyof Client>(k: K, v: Client[K]) => setC((x) => ({ ...x, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!c.name.trim() && !c.company.trim()) return setError('Add a contact name or company.');
    if (c.email && !/^\S+@\S+\.\S+$/.test(c.email)) return setError('That email address looks incomplete.');
    saveClient(c);
    toast(client ? 'Client updated' : 'Client added');
    onSaved?.(c);
    onClose();
  };

  return (
    <Modal
      title={client ? 'Edit client' : 'New client'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" form="client-form" className="btn btn-primary">{client ? 'Save changes' : 'Add client'}</button>
        </>
      }
    >
      <form id="client-form" className="form-grid" onSubmit={submit}>
        <Field label="Contact name">
          <input autoFocus value={c.name} onChange={(e) => set('name', e.target.value)} placeholder="Jane Doe" />
        </Field>
        <Field label="Company">
          <input value={c.company} onChange={(e) => set('company', e.target.value)} placeholder="Acme Inc." />
        </Field>
        <Field label="Email">
          <input type="email" value={c.email} onChange={(e) => set('email', e.target.value)} placeholder="billing@acme.com" />
        </Field>
        <Field label="Phone">
          <input value={c.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="Billing address" className="span-2">
          <textarea rows={3} value={c.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="Currency" hint="Used by default for this client's invoices">
          <select value={c.currency} onChange={(e) => set('currency', e.target.value)}>
            {CURRENCIES.map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Private notes" className="span-2">
          <textarea rows={2} value={c.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Only visible to you" />
        </Field>
        {error && <p className="form-error span-2">{error}</p>}
      </form>
    </Modal>
  );
}
