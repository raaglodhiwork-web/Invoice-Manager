import { useState } from 'react';
import type { Invoice } from '../types';
import { useStore, useToast } from '../store';
import { formatMoney, invoiceTotals, todayISO } from '../utils';
import { Field, Modal } from './ui';

const METHODS = ['Bank transfer', 'Card', 'Cash', 'Check', 'PayPal', 'Stripe', 'Other'];

export default function PaymentForm({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { addPayment } = useStore();
  const toast = useToast();
  const { balance } = invoiceTotals(invoice);
  const [amount, setAmount] = useState(String(balance));
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState('Bank transfer');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) return setError('Enter an amount greater than zero.');
    addPayment(invoice.id, { amount: value, date, method, note });
    toast(value >= balance ? 'Invoice marked as paid' : 'Payment recorded');
    onClose();
  };

  return (
    <Modal
      title="Record payment"
      onClose={onClose}
      width={440}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" form="payment-form" className="btn btn-primary">Record payment</button>
        </>
      }
    >
      <form id="payment-form" className="form-grid" onSubmit={submit}>
        <p className="span-2 muted">
          Balance due on {invoice.number}: <strong className="text">{formatMoney(balance, invoice.currency)}</strong>
        </p>
        <Field label={`Amount (${invoice.currency})`}>
          <input autoFocus type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Method" className="span-2">
          <div className="chips">
            {METHODS.map((m) => (
              <button type="button" key={m} className={`chip ${method === m ? 'active' : ''}`} onClick={() => setMethod(m)}>{m}</button>
            ))}
          </div>
        </Field>
        <Field label="Note (optional)" className="span-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Reference number" />
        </Field>
        {error && <p className="form-error span-2">{error}</p>}
      </form>
    </Modal>
  );
}
