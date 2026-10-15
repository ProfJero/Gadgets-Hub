import { useEffect, useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Zap, Image as ImageIcon, Tags } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { saveHome, logActivity } from '../../lib/api';
import { useStore } from '../../context/StoreContext';
import { toDate } from '../../lib/format';
import { PageHeader, ImageUploader, ProductPicker } from '../components/kit';
import { Field, Toggle, Img, Spinner } from '../../components/ui';
import { toast } from '../../store';

const toLocal = (v) => {
  const d = toDate(v);
  if (!d) return '';
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
};

export default function Content() {
  const { home, products } = useStore();
  const [banners, setBanners] = useState([]);
  const [flash, setFlash] = useState({ enabled: false, title: 'Flash Sale', endsAt: '', productIds: [] });
  const [brands, setBrands] = useState('');
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBanners(home.banners || []);
    setFlash({ ...home.flashSale, endsAt: toLocal(home.flashSale?.endsAt), productIds: home.flashSale?.productIds || [] });
    setBrands((home.featuredBrands || []).join(', '));
  }, [home]);

  const save = async () => {
    setBusy(true);
    try {
      await saveHome({
        banners: banners.filter((b) => b.image),
        flashSale: { ...flash, endsAt: flash.endsAt ? Timestamp.fromDate(new Date(flash.endsAt)) : null },
        featuredBrands: brands.split(',').map((b) => b.trim()).filter(Boolean),
      });
      await logActivity('Updated homepage content');
      toast('Homepage updated');
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const setB = (i, k, v) => setBanners((bs) => bs.map((b, j) => (j === i ? { ...b, [k]: v } : b)));
  const moveB = (i, d) => setBanners((bs) => { const n = [...bs]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n; });
  const flashProducts = flash.productIds.map((id) => products.find((p) => p.id === id)).filter(Boolean);

  return (
    <div className="pb-24">
      <PageHeader title="Homepage" sub="Control the hero banners, flash sale and brands on your storefront." actions={<button onClick={save} disabled={busy} className="btn-primary">{busy ? <Spinner /> : <Save className="h-4 w-4" />} Publish changes</button>} />

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold"><ImageIcon className="h-5 w-5" /> Hero banners</h2>
          <button onClick={() => setBanners([...banners, { image: '', title: '', subtitle: '', cta: 'Shop now', link: '/shop' }])} className="btn-outline btn-sm"><Plus className="h-4 w-4" /> Add banner</button>
        </div>
        <p className="mt-1 text-xs text-ink-muted">Recommended size 1600×640px. Without banners, a branded default hero is shown.</p>
        <div className="mt-4 space-y-4">
          {banners.map((b, i) => (
            <div key={i} className="grid gap-4 rounded-2xl bg-slate-50 p-4 lg:grid-cols-[360px_1fr]">
              <ImageUploader single folder="gadgets-hub/banners" images={b.image ? [{ url: b.image }] : []} onChange={(v) => setB(i, 'image', v[0]?.url || '')} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Headline"><input className="input" value={b.title} onChange={(e) => setB(i, 'title', e.target.value)} placeholder="Back to school deals" /></Field>
                <Field label="Sub-text"><input className="input" value={b.subtitle} onChange={(e) => setB(i, 'subtitle', e.target.value)} placeholder="Laptops from GH₵2,999" /></Field>
                <Field label="Button text"><input className="input" value={b.cta} onChange={(e) => setB(i, 'cta', e.target.value)} /></Field>
                <Field label="Link"><input className="input" value={b.link} onChange={(e) => setB(i, 'link', e.target.value)} placeholder="/category/laptops" /></Field>
                <div className="flex gap-2 sm:col-span-2">
                  <button disabled={i === 0} onClick={() => moveB(i, -1)} className="btn-outline btn-sm"><ArrowUp className="h-4 w-4" /></button>
                  <button disabled={i === banners.length - 1} onClick={() => moveB(i, 1)} className="btn-outline btn-sm"><ArrowDown className="h-4 w-4" /></button>
                  <button onClick={() => setBanners(banners.filter((_, j) => j !== i))} className="btn-ghost btn-sm ml-auto text-rose-600"><Trash2 className="h-4 w-4" /> Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card mt-4 p-5">
        <h2 className="flex items-center gap-2 font-bold"><Zap className="h-5 w-5 text-brand-500" /> Flash sale</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Toggle checked={!!flash.enabled} onChange={(v) => setFlash({ ...flash, enabled: v })} label="Show flash sale on homepage" desc="Displays with a live countdown timer" /></div>
          <Field label="Title"><input className="input" value={flash.title} onChange={(e) => setFlash({ ...flash, title: e.target.value })} /></Field>
          <Field label="Ends at"><input className="input" type="datetime-local" value={flash.endsAt} onChange={(e) => setFlash({ ...flash, endsAt: e.target.value })} /></Field>
        </div>
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between"><span className="label !mb-0">Products ({flashProducts.length})</span><button onClick={() => setPicker(true)} className="btn-outline btn-sm">Choose products</button></div>
          <div className="flex flex-wrap gap-2">
            {flashProducts.map((p) => <span key={p.id} className="flex items-center gap-2 rounded-xl bg-slate-50 py-1 pl-1 pr-3 text-xs ring-1 ring-slate-200"><Img src={p.images?.[0]?.url} w={60} h={60} fit="contain" className="h-8 w-8 rounded-lg" />{p.name}</span>)}
          </div>
          <p className="mt-2 text-xs text-ink-muted">Tip: set a “Was price” on these products so customers see the discount.</p>
        </div>
      </section>

      <section className="card mt-4 p-5">
        <h2 className="flex items-center gap-2 font-bold"><Tags className="h-5 w-5" /> Featured brands</h2>
        <Field label="Comma-separated, in display order" className="mt-3"><input className="input" value={brands} onChange={(e) => setBrands(e.target.value)} placeholder="HP, Dell, Lenovo, Apple" /></Field>
      </section>

      <ProductPicker open={picker} onClose={() => setPicker(false)} products={products} selected={flash.productIds} onChange={(ids) => setFlash({ ...flash, productIds: ids })} />
    </div>
  );
}
