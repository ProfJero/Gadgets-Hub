import { useEffect, useState } from 'react';
import { Plus, TicketPercent, Pencil, Trash2, Copy } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { fetchCoupons, saveCoupon, deleteCoupon, logActivity } from '../../lib/api';
import { money, dateShort, toDate } from '../../lib/format';
import { PageHeader } from '../components/kit';
import { Modal, Field, Toggle, Empty, PageLoader, Badge } from '../../components/ui';
import { toast } from '../../store';

const BLANK = { code: '', type: 'percent', value: 10, minOrder: 0, maxDiscount: 0, usageLimit: 0, expiresAt: '', active: true, description: '' };

export default function Coupons() {
  const [items, setItems] = useState(null);
  const [edit, setEdit] = useState(null);
  const load = () => fetchCoupons().then(setItems).catch((e) => { toast(e.message, 'error'); setItems([]); });
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    const code = edit.code.trim().toUpperCase().replace(/\s/g, '');
    if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return toast('Code: 3–20 letters/numbers', 'error');
    try {
      await saveCoupon({ ...edit, code, maxDiscount: Number(edit.maxDiscount) || 0, expiresAt: edit.expiresAt ? Timestamp.fromDate(new Date(`${edit.expiresAt}T23:59:59`)) : null });
      await logActivity(`Saved coupon ${code}`);
      toast('Coupon saved');
      setEdit(null);
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  if (!items) return <PageLoader />;
  return (
    <div>
      <PageHeader title="Coupons" sub="Promo codes for campaigns, influencers and loyal customers."
        actions={<button onClick={() => setEdit({ ...BLANK })} className="btn-primary"><Plus className="h-4 w-4" /> New coupon</button>} />
      <div className="card">
        {items.length === 0 ? <Empty icon={TicketPercent} title="No coupons yet" text="Create a code like STUDENT10 or BACK2SCHOOL." /> : (
          <ul className="divide-y divide-slate-100">
            {items.map((c) => {
              const exp = toDate(c.expiresAt);
              const expired = exp && exp < new Date();
              const used = c.usageLimit && c.usedCount >= c.usageLimit;
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                  <button onClick={() => { navigator.clipboard?.writeText(c.code); toast('Copied'); }} className="flex items-center gap-2 rounded-lg border-2 border-dashed border-brand-300 bg-brand-50 px-3 py-1.5 font-mono font-bold text-brand-800">{c.code}<Copy className="h-3.5 w-3.5" /></button>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="font-semibold">{c.type === 'percent' ? `${c.value}% off` : `${money(c.value)} off`}{c.minOrder > 0 && ` · min ${money(c.minOrder)}`}{c.maxDiscount > 0 && ` · max ${money(c.maxDiscount)}`}</div>
                    <div className="text-xs text-ink-muted">Used {c.usedCount || 0}{c.usageLimit ? `/${c.usageLimit}` : ''} · {exp ? `Expires ${dateShort(exp)}` : 'No expiry'}</div>
                  </div>
                  {!c.active ? <Badge>Inactive</Badge> : expired ? <Badge tone="bg-rose-50 text-rose-700 ring-rose-200">Expired</Badge> : used ? <Badge tone="bg-amber-50 text-amber-700 ring-amber-200">Used up</Badge> : <Badge tone="bg-emerald-50 text-emerald-700 ring-emerald-200">Active</Badge>}
                  <button onClick={() => setEdit({ ...BLANK, ...c, expiresAt: exp ? exp.toISOString().slice(0, 10) : '' })} className="btn-ghost btn-sm"><Pencil className="h-4 w-4" /></button>
                  <button onClick={async () => { if (confirm(`Delete ${c.code}?`)) { await deleteCoupon(c.id); load(); } }} className="btn-ghost btn-sm text-rose-600"><Trash2 className="h-4 w-4" /></button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Edit ${edit.code}` : 'New coupon'} footer={<button form="cp" className="btn-primary">Save coupon</button>}>
        {edit && (
          <form id="cp" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" className="sm:col-span-2"><input className="input font-mono uppercase" disabled={!!edit.id} value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} placeholder="STUDENT10" required /></Field>
            <Field label="Type"><select className="input" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}><option value="percent">Percentage (%)</option><option value="fixed">Fixed amount (GH₵)</option></select></Field>
            <Field label={edit.type === 'percent' ? 'Percent off' : 'Amount off (GH₵)'}><input className="input" type="number" min="0" value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} required /></Field>
            <Field label="Minimum order (GH₵)"><input className="input" type="number" min="0" value={edit.minOrder} onChange={(e) => setEdit({ ...edit, minOrder: e.target.value })} /></Field>
            {edit.type === 'percent' && <Field label="Max discount (GH₵)" hint="0 = no cap"><input className="input" type="number" min="0" value={edit.maxDiscount} onChange={(e) => setEdit({ ...edit, maxDiscount: e.target.value })} /></Field>}
            <Field label="Usage limit" hint="0 = unlimited"><input className="input" type="number" min="0" value={edit.usageLimit} onChange={(e) => setEdit({ ...edit, usageLimit: e.target.value })} /></Field>
            <Field label="Expires on"><input className="input" type="date" value={edit.expiresAt} onChange={(e) => setEdit({ ...edit, expiresAt: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="Active" /></div>
          </form>
        )}
      </Modal>
    </div>
  );
}
