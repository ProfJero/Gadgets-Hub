import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
import { getOrder } from '../lib/api';
import { normalizePhone } from '../lib/ghana';
import { Field, Spinner } from '../components/ui';

export default function Track() {
  const [num, setNum] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    let id = num.trim().toUpperCase().replace(/\s/g, '');
    if (id && !id.startsWith('GH-')) id = `GH-${id.replace(/^GH/, '')}`;
    setBusy(true);
    try {
      const o = await getOrder(id);
      if (!o || normalizePhone(o.customer?.phone) !== normalizePhone(phone)) {
        setErr("We couldn't find an order with that number and phone. Please check and try again.");
        return;
      }
      navigate(`/order/${id}`);
    } catch {
      setErr("We couldn't find that order.");
    } finally { setBusy(false); }
  };

  return (
    <div className="container-x max-w-lg py-10">
      <div className="card p-6 sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><PackageSearch className="h-7 w-7" /></div>
        <h1 className="mt-4 font-display text-3xl font-bold">Track your order</h1>
        <p className="mt-1 text-sm text-ink-muted">Enter the order number from your receipt or SMS and the phone number you used.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Order number"><input className="input font-mono uppercase" value={num} onChange={(e) => setNum(e.target.value)} placeholder="GH-XXXXXXXX" required /></Field>
          <Field label="Phone number"><input className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024 123 4567" required /></Field>
          {err && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
          <button disabled={busy} className="btn-primary btn-lg w-full">{busy ? <Spinner /> : 'Track order'}</button>
        </form>
      </div>
    </div>
  );
}
