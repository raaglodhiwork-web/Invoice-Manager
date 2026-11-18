import { useRef, useState } from 'react';
import { Download, ImagePlus, Upload } from 'lucide-react';
import { useStore, useToast } from '../store';
import type { AppData, Settings as S } from '../types';
import { CURRENCIES, downloadFile, todayISO } from '../utils';
import { Field, PageHeader } from '../components/ui';

const ACCENTS = ['#4f46e5', '#0f766e', '#2563eb', '#be123c', '#c2410c', '#111827'];

export default function Settings() {
  const { data, updateSettings, replaceAll, resetEmpty, loadDemo } = useStore();
  const toast = useToast();
  const [s, setS] = useState<S>(data.settings);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(s) !== JSON.stringify(data.settings);

  const setBiz = (k: keyof S['business'], v: string) => setS((x) => ({ ...x, business: { ...x.business, [k]: v } }));
  const set = <K extends keyof S>(k: K, v: S[K]) => setS((x) => ({ ...x, [k]: v }));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(s);
    toast('Settings saved');
  };

  const onLogo = (file?: File) => {
    if (!file) return;
    if (file.size > 500_000) return toast('Logo must be under 500 KB');
    const r = new FileReader();
    r.onload = () => setBiz('logo', String(r.result));
    r.readAsDataURL(file);
  };

  const exportBackup = () => downloadFile(`ledgerly-backup-${todayISO()}.json`, JSON.stringify(data, null, 2), 'application/json');
  const importBackup = (file?: File) => {
    if (!file) return;
    file.text().then((txt) => {
      try {
        const parsed = JSON.parse(txt) as AppData;
        if (parsed.version !== 1 || !Array.isArray(parsed.invoices) || !Array.isArray(parsed.clients)) throw new Error();
        if (!confirm('Replace all current data with this backup?')) return;
        replaceAll(parsed);
        setS(parsed.settings);
        toast('Backup restored');
      } catch {
        toast('That file is not a valid Ledgerly backup');
      }
    });
  };

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Your business details and invoice defaults"
        actions={<button className="btn btn-primary" type="submit" form="settings-form" disabled={!dirty}>Save changes</button>}
      />

      <form id="settings-form" onSubmit={save} className="settings">
        <section className="card pad settings-section">
          <div className="settings-intro">
            <h2 className="section-title">Business profile</h2>
            <p className="muted small">Shown at the top of every invoice.</p>
          </div>
          <div className="form-grid">
            <div className="span-2 logo-row">
              <div className="logo-box">{s.business.logo ? <img src={s.business.logo} alt="Logo" /> : <ImagePlus size={22} className="muted" />}</div>
              <div className="row-gap">
                <button type="button" className="btn" onClick={() => logoRef.current?.click()}>{s.business.logo ? 'Change logo' : 'Upload logo'}</button>
                {s.business.logo && <button type="button" className="btn btn-ghost" onClick={() => setBiz('logo', '')}>Remove</button>}
                <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => onLogo(e.target.files?.[0])} />
              </div>
            </div>
            <Field label="Business name"><input value={s.business.name} onChange={(e) => setBiz('name', e.target.value)} /></Field>
            <Field label="Email"><input type="email" value={s.business.email} onChange={(e) => setBiz('email', e.target.value)} /></Field>
            <Field label="Phone"><input value={s.business.phone} onChange={(e) => setBiz('phone', e.target.value)} /></Field>
            <Field label="Website"><input value={s.business.website} onChange={(e) => setBiz('website', e.target.value)} /></Field>
            <Field label="Address" className="span-2"><textarea rows={3} value={s.business.address} onChange={(e) => setBiz('address', e.target.value)} /></Field>
            <Field label="Tax / VAT ID"><input value={s.business.taxId} onChange={(e) => setBiz('taxId', e.target.value)} /></Field>
            <Field label="Brand color">
              <div className="swatches">
                {ACCENTS.map((c) => (
                  <button type="button" key={c} className={`swatch ${s.accentColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => set('accentColor', c)} aria-label={`Accent ${c}`} />
                ))}
                <input type="color" value={s.accentColor} onChange={(e) => set('accentColor', e.target.value)} aria-label="Custom color" />
              </div>
            </Field>
          </div>
        </section>

        <section className="card pad settings-section">
          <div className="settings-intro">
            <h2 className="section-title">Invoice defaults</h2>
            <p className="muted small">Applied to new invoices. You can override them per invoice.</p>
          </div>
          <div className="form-grid">
            <Field label="Default currency">
              <select value={s.currency} onChange={(e) => set('currency', e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="Default tax rate (%)"><input type="number" min="0" step="any" value={s.taxRate} onChange={(e) => set('taxRate', Number(e.target.value))} /></Field>
            <Field label="Payment terms (days)"><input type="number" min="0" value={s.paymentTermsDays} onChange={(e) => set('paymentTermsDays', Number(e.target.value))} /></Field>
            <Field label="Number prefix" hint={`Next invoice: ${s.invoicePrefix}${s.nextInvoiceNumber}`}>
              <input value={s.invoicePrefix} onChange={(e) => set('invoicePrefix', e.target.value)} />
            </Field>
            <Field label="Next number"><input type="number" min="1" value={s.nextInvoiceNumber} onChange={(e) => set('nextInvoiceNumber', Number(e.target.value))} /></Field>
            <Field label="Payment instructions" className="span-2" hint="Bank details, payment link, etc. Printed on every invoice.">
              <textarea rows={2} value={s.paymentInstructions} onChange={(e) => set('paymentInstructions', e.target.value)} />
            </Field>
            <Field label="Default notes" className="span-2"><textarea rows={2} value={s.defaultNotes} onChange={(e) => set('defaultNotes', e.target.value)} /></Field>
            <Field label="Default terms" className="span-2"><textarea rows={2} value={s.defaultTerms} onChange={(e) => set('defaultTerms', e.target.value)} /></Field>
          </div>
        </section>

        <section className="card pad settings-section">
          <div className="settings-intro">
            <h2 className="section-title">Data</h2>
            <p className="muted small">Your data is stored privately in this browser. Back it up regularly.</p>
          </div>
          <div className="stack">
            <div className="row-gap wrap">
              <button type="button" className="btn" onClick={exportBackup}><Download size={16} /> Export backup</button>
              <button type="button" className="btn" onClick={() => fileRef.current?.click()}><Upload size={16} /> Restore backup</button>
              <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => { importBackup(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
            <div className="row-gap wrap">
              <button type="button" className="btn btn-ghost" onClick={() => { if (confirm('Replace all data with sample data?')) { loadDemo(); toast('Sample data loaded'); setTimeout(() => location.reload(), 300); } }}>Load sample data</button>
              <button type="button" className="btn btn-ghost btn-danger" onClick={() => { if (confirm('Erase all clients, invoices and settings? Export a backup first if you need one.')) { resetEmpty(); toast('All data erased'); setTimeout(() => location.reload(), 300); } }}>Erase all data</button>
            </div>
          </div>
        </section>
      </form>
    </>
  );
}
