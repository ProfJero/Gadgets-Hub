import { useEffect, useState } from 'react';
import { Save, Store, Truck, CreditCard, Plug, FileText, ExternalLink, CheckCircle2 } from 'lucide-react';
import { saveSettings, logActivity } from '../../lib/api';
import { useStore } from '../../context/StoreContext';
import { REGIONS } from '../../lib/ghana';
import { configureCloudinary } from '../../lib/cloudinary';
import { PageHeader } from '../components/kit';
import { Field, Toggle, Tabs, Spinner } from '../../components/ui';
import { toast } from '../../store';

export default function Settings() {
  const { settings } = useStore();
  const [s, setS] = useState(settings);
  const [tab, setTab] = useState('store');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setS(settings); }, [settings]);

  const set = (k, v) => setS((x) => ({ ...x, [k]: v }));
  const setPay = (k, v) => setS((x) => ({ ...x, payments: { ...x.payments, [k]: v } }));
  const setNested = (group, k, v) => setS((x) => ({ ...x, [group]: { ...(x[group] || {}), [k]: v } }));
  const setZone = (i, k, v) => set('deliveryZones', s.deliveryZones.map((z, j) => (j === i ? { ...z, [k]: k === 'fee' ? Number(v) : v } : z)));

  const save = async () => {
    if (s.payments.paystackPublicKey && !/^pk_(test|live)_/.test(s.payments.paystackPublicKey.trim())) {
      return toast('Paystack key should start with pk_live_ or pk_test_. Never paste the secret key here.', 'error');
    }
    setBusy(true);
    try {
      const { updatedAt, ...rest } = s; // eslint-disable-line no-unused-vars
      await saveSettings({
        ...rest,
        freeDeliveryThreshold: Number(s.freeDeliveryThreshold) || 0,
        lowStockThreshold: Number(s.lowStockThreshold) || 0,
        payments: { ...s.payments, codMaxAmount: Number(s.payments.codMaxAmount) || 0, paystackPublicKey: s.payments.paystackPublicKey.trim() },
      });
      configureCloudinary(s.cloudinary);
      await logActivity('Updated store settings', tab);
      toast('Settings saved');
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const missingZones = REGIONS.filter((r) => !s.deliveryZones?.some((z) => z.region === r));

  return (
    <div className="pb-20">
      <PageHeader title="Settings" actions={<button onClick={save} disabled={busy} className="btn-primary">{busy ? <Spinner /> : <Save className="h-4 w-4" />} Save settings</button>} />
      <div className="card">
        <Tabs className="px-2" value={tab} onChange={setTab} tabs={[
          { value: 'store', label: <span className="flex items-center gap-1.5"><Store className="h-4 w-4" />Store</span> },
          { value: 'delivery', label: <span className="flex items-center gap-1.5"><Truck className="h-4 w-4" />Delivery</span> },
          { value: 'payments', label: <span className="flex items-center gap-1.5"><CreditCard className="h-4 w-4" />Payments</span> },
          { value: 'integrations', label: <span className="flex items-center gap-1.5"><Plug className="h-4 w-4" />Integrations</span> },
          { value: 'policies', label: <span className="flex items-center gap-1.5"><FileText className="h-4 w-4" />Policies</span> },
        ]} />
        <div className="p-5">
          {tab === 'store' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Store name"><input className="input" value={s.storeName} onChange={(e) => set('storeName', e.target.value)} /></Field>
              <Field label="Tagline"><input className="input" value={s.tagline} onChange={(e) => set('tagline', e.target.value)} /></Field>
              <Field label="Phone"><input className="input" value={s.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
              <Field label="WhatsApp number" hint="Used for the chat button and order enquiries"><input className="input" value={s.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} /></Field>
              <Field label="Email"><input className="input" type="email" value={s.email} onChange={(e) => set('email', e.target.value)} /></Field>
              <Field label="Opening hours"><input className="input" value={s.openingHours} onChange={(e) => set('openingHours', e.target.value)} /></Field>
              <Field label="Shop address"><input className="input" value={s.address} onChange={(e) => set('address', e.target.value)} /></Field>
              <Field label="GhanaPost GPS"><input className="input uppercase" value={s.gps} onChange={(e) => set('gps', e.target.value.toUpperCase())} /></Field>
              <Field label="Announcement bar" className="sm:col-span-2" hint="Top strip on every page. Leave blank to hide."><input className="input" value={s.announcement} onChange={(e) => set('announcement', e.target.value)} /></Field>
              <Field label="Low-stock alert level"><input className="input" type="number" min="0" value={s.lowStockThreshold} onChange={(e) => set('lowStockThreshold', e.target.value)} /></Field>
              <div />
              {['facebook', 'instagram', 'tiktok', 'x'].map((k) => (
                <Field key={k} label={`${k[0].toUpperCase()}${k.slice(1)} URL`}><input className="input" value={s.social?.[k] || ''} onChange={(e) => setNested('social', k, e.target.value)} placeholder="https://" /></Field>
              ))}
            </div>
          )}

          {tab === 'delivery' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Free delivery threshold (GH₵)" hint="0 = no free delivery"><input className="input" type="number" min="0" value={s.freeDeliveryThreshold} onChange={(e) => set('freeDeliveryThreshold', e.target.value)} /></Field>
                <div className="pt-7"><Toggle checked={!!s.freeDeliveryAllRegions} onChange={(v) => set('freeDeliveryAllRegions', v)} label="Apply free delivery to all regions" desc="Off = Greater Accra only" /></div>
                <div className="sm:col-span-2"><Toggle checked={s.pickupEnabled} onChange={(v) => set('pickupEnabled', v)} label="Allow in-store pickup" /></div>
                {s.pickupEnabled && <Field label="Pickup address" className="sm:col-span-2"><input className="input" value={s.pickupAddress} onChange={(e) => set('pickupAddress', e.target.value)} /></Field>}
              </div>
              <div>
                <h3 className="mb-2 font-bold">Delivery fees by region</h3>
                <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-ink-muted"><tr><th className="px-3 py-2">Region</th><th className="px-3 py-2">Fee (GH₵)</th><th className="px-3 py-2">Delivery time</th><th /></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {s.deliveryZones.map((z, i) => (
                        <tr key={z.region}>
                          <td className="px-3 py-2 font-medium">{z.region}</td>
                          <td className="px-3 py-2"><input className="input w-28 !py-1.5" type="number" min="0" value={z.fee} onChange={(e) => setZone(i, 'fee', e.target.value)} /></td>
                          <td className="px-3 py-2"><input className="input !py-1.5" value={z.eta} onChange={(e) => setZone(i, 'eta', e.target.value)} /></td>
                          <td className="px-3 py-2"><button onClick={() => set('deliveryZones', s.deliveryZones.filter((_, j) => j !== i))} className="text-xs font-semibold text-rose-600">Remove</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {missingZones.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-ink-muted">Add region:</span>
                    {missingZones.map((r) => <button key={r} onClick={() => set('deliveryZones', [...s.deliveryZones, { region: r, fee: 80, eta: '2–4 days' }])} className="chip-off">+ {r}</button>)}
                  </div>
                )}
                <p className="mt-2 text-xs text-ink-muted">Customers in regions not listed here will see “fee confirmed after order”.</p>
              </div>
            </div>
          )}

          {tab === 'payments' && (
            <div className="space-y-6">
              <div className="rounded-2xl p-4 ring-1 ring-slate-200">
                <Toggle checked={s.payments.paystack} onChange={(v) => setPay('paystack', v)} label="Paystack: Mobile Money & cards" desc="Instant MTN MoMo, Telecel Cash, AT Money, Visa & Mastercard" />
                {s.payments.paystack && (
                  <div className="mt-4 space-y-2">
                    <Field label="Paystack PUBLIC key" hint="Paystack Dashboard → Settings → API Keys. Use pk_live_… for real payments. Never paste the secret key."><input className="input font-mono" value={s.payments.paystackPublicKey} onChange={(e) => setPay('paystackPublicKey', e.target.value)} placeholder="pk_live_xxxxxxxx" /></Field>
                    <a href="https://dashboard.paystack.com/#/settings/developers" target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1 text-xs">Open Paystack dashboard <ExternalLink className="h-3 w-3" /></a>
                  </div>
                )}
              </div>
              <div className="rounded-2xl p-4 ring-1 ring-slate-200">
                <Toggle checked={s.payments.momo_manual} onChange={(v) => setPay('momo_manual', v)} label="Manual MoMo transfer" desc="Customer sends to your merchant number and enters the transaction ID" />
                {s.payments.momo_manual && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <Field label="Network"><select className="input" value={s.payments.momoNetwork} onChange={(e) => setPay('momoNetwork', e.target.value)}><option>MTN</option><option>Telecel</option><option>AirtelTigo</option></select></Field>
                    <Field label="MoMo number"><input className="input" value={s.payments.momoNumber} onChange={(e) => setPay('momoNumber', e.target.value)} /></Field>
                    <Field label="Account name"><input className="input" value={s.payments.momoName} onChange={(e) => setPay('momoName', e.target.value)} /></Field>
                  </div>
                )}
              </div>
              <div className="rounded-2xl p-4 ring-1 ring-slate-200">
                <Toggle checked={s.payments.cod} onChange={(v) => setPay('cod', v)} label="Pay on delivery / at pickup" desc="Cash or MoMo to the rider" />
                {s.payments.cod && <Field label="Maximum order for pay-on-delivery (GH₵)" hint="0 = no limit. Limits risk on expensive items." className="mt-4 max-w-xs"><input className="input" type="number" min="0" value={s.payments.codMaxAmount} onChange={(e) => setPay('codMaxAmount', e.target.value)} /></Field>}
              </div>
            </div>
          )}

          {tab === 'integrations' && (
            <div className="space-y-4">
              <div className="rounded-2xl p-4 ring-1 ring-slate-200">
                <h3 className="font-bold">Cloudinary (image hosting)</h3>
                <p className="mt-1 text-sm text-ink-muted">Product photos are uploaded to Cloudinary and automatically compressed for fast loading on mobile data.</p>
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink-soft">
                  <li>In Cloudinary, go to <b>Settings → Upload → Upload presets</b>.</li>
                  <li>Click <b>Add upload preset</b>, set <b>Signing mode: Unsigned</b>, and save. (Optionally set a folder and limit formats to images.)</li>
                  <li>Copy your <b>Cloud name</b> (from the dashboard) and the <b>preset name</b> below.</li>
                </ol>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Cloud name"><input className="input font-mono" value={s.cloudinary?.cloudName || ''} onChange={(e) => setNested('cloudinary', 'cloudName', e.target.value)} placeholder="gadgetshub" /></Field>
                  <Field label="Unsigned upload preset"><input className="input font-mono" value={s.cloudinary?.uploadPreset || ''} onChange={(e) => setNested('cloudinary', 'uploadPreset', e.target.value)} placeholder="gadgets_hub_unsigned" /></Field>
                </div>
                {s.cloudinary?.cloudName && s.cloudinary?.uploadPreset && <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Ready. Save, then try uploading a product photo.</p>}
              </div>
            </div>
          )}

          {tab === 'policies' && (
            <div className="space-y-4">
              <Field label="Warranty policy"><textarea className="input min-h-[100px]" value={s.warrantyText} onChange={(e) => set('warrantyText', e.target.value)} /></Field>
              <Field label="Returns policy"><textarea className="input min-h-[100px]" value={s.returnPolicy} onChange={(e) => set('returnPolicy', e.target.value)} /></Field>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
