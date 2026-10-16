import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, Trash2, ExternalLink, Save } from 'lucide-react';
import { getProduct, saveProduct, deleteProduct, logActivity } from '../../lib/api';
import { useStore } from '../../context/StoreContext';
import { CONDITIONS, SPEC_FIELDS, USE_CASES } from '../../lib/constants';
import { money, slugify } from '../../lib/format';
import { ImageUploader, PageHeader } from '../components/kit';
import { Field, Toggle, PageLoader, Spinner, cx } from '../../components/ui';
import { toast } from '../../store';

const BLANK = {
  name: '', brand: '', category: 'laptops', condition: 'new', sku: '', price: '', compareAtPrice: '', costPrice: '', stock: 1,
  images: [], specs: {}, highlights: [''], description: '', warranty: '', useCases: [], tags: [], active: true, featured: false,
};

const BRAND_SUGGESTIONS = ['HP', 'Dell', 'Lenovo', 'Apple', 'ASUS', 'Acer', 'Microsoft', 'Samsung', 'MSI', 'Toshiba', 'Logitech', 'Anker', 'Sony', 'JBL', 'Oraimo', 'TP-Link', 'SanDisk', 'Kingston'];
const SPEC_HINTS = { processor: 'Intel Core i5-1135G7', ram: '16GB DDR4', storage: '512GB NVMe SSD', display: '14" Full HD IPS', graphics: 'Intel Iris Xe', os: 'Windows 11 Pro', battery: 'Up to 9 hours', weight: '1.4 kg', ports: 'USB-C, HDMI, 2× USB-A', keyboard: 'Backlit' };

function Section({ title, desc, children }) {
  return (
    <section className="card p-5">
      <h2 className="font-bold">{title}</h2>
      {desc && <p className="mt-0.5 text-xs text-ink-muted">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function ProductEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { categories, refresh, products } = useStore();
  const [p, setP] = useState(isNew ? BLANK : null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!isNew) getProduct(id).then((x) => setP(x ? { ...BLANK, ...x, highlights: x.highlights?.length ? x.highlights : [''] } : false));
  }, [id, isNew]);

  useEffect(() => {
    if (!dirty) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const brands = useMemo(() => Array.from(new Set([...BRAND_SUGGESTIONS, ...products.map((x) => x.brand).filter(Boolean)])).sort(), [products]);

  if (p === null) return <PageLoader />;
  if (p === false) return <p className="p-8 text-center">Product not found. <Link to="/admin/products" className="link">Back</Link></p>;

  const set = (k, v) => { setP((x) => ({ ...x, [k]: v })); setDirty(true); };
  const setSpec = (k, v) => set('specs', { ...p.specs, [k]: v });
  const margin = Number(p.price) && Number(p.costPrice) ? Number(p.price) - Number(p.costPrice) : null;
  const isLaptop = p.category === 'laptops';

  const save = async (e) => {
    e?.preventDefault();
    if (!p.name.trim()) return toast('Product name is required', 'error');
    if (!(Number(p.price) > 0)) return toast('Enter a selling price', 'error');
    if (p.compareAtPrice && Number(p.compareAtPrice) <= Number(p.price)) return toast('“Was” price should be higher than the selling price', 'error');
    setBusy(true);
    try {
      const data = {
        ...p,
        name: p.name.trim(),
        brand: p.brand.trim(),
        slug: p.slug || `${slugify(p.name)}-${Math.random().toString(36).slice(2, 6)}`,
        highlights: p.highlights.map((h) => h.trim()).filter(Boolean),
        specs: Object.fromEntries(Object.entries(p.specs || {}).filter(([, v]) => v && String(v).trim())),
      };
      const newId = await saveProduct(data);
      await logActivity(`${isNew ? 'Created' : 'Updated'} product`, data.name);
      setDirty(false);
      refresh();
      toast(isNew ? 'Product created' : 'Saved');
      if (isNew) navigate(`/admin/products/${newId}`, { replace: true });
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirm(`Delete “${p.name}” permanently? Consider hiding it instead.`)) return;
    await deleteProduct(p.id);
    await logActivity('Deleted product', p.name);
    refresh();
    toast('Product deleted', 'info');
    navigate('/admin/products');
  };

  return (
    <form onSubmit={save} className="pb-24">
      <Link to="/admin/products" className="btn-ghost -ml-3 mb-2"><ArrowLeft className="h-4 w-4" /> Products</Link>
      <PageHeader title={isNew ? 'New product' : p.name || 'Edit product'}
        actions={!isNew && <>
          {p.active && <a href={`/product/${p.slug}`} target="_blank" rel="noreferrer" className="btn-outline"><ExternalLink className="h-4 w-4" /> View</a>}
          <button type="button" onClick={remove} className="btn-ghost text-rose-600"><Trash2 className="h-4 w-4" /> Delete</button>
        </>} />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Section title="Basic information">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product name" className="sm:col-span-2"><input className="input" value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. HP EliteBook 840 G8, Core i5, 16GB/512GB" required /></Field>
              <Field label="Brand">
                <input className="input" list="brands" value={p.brand} onChange={(e) => set('brand', e.target.value)} placeholder="HP" />
                <datalist id="brands">{brands.map((b) => <option key={b} value={b} />)}</datalist>
              </Field>
              <Field label="Category">
                <select className="input" value={p.category} onChange={(e) => set('category', e.target.value)}>
                  {categories.length === 0 && <option value="laptops">Laptops</option>}
                  {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Condition">
                <div className="grid grid-cols-3 gap-2">
                  {CONDITIONS.map((c) => (
                    <button type="button" key={c.value} onClick={() => set('condition', c.value)} className={cx('rounded-xl px-2 py-2 text-xs font-semibold ring-2', p.condition === c.value ? 'bg-navy-50 text-navy-800 ring-navy-600' : 'ring-slate-200')}>{c.short}</button>
                  ))}
                </div>
              </Field>
              <Field label="SKU / Serial (optional)"><input className="input" value={p.sku} onChange={(e) => set('sku', e.target.value)} placeholder="GH-1001" /></Field>
            </div>
          </Section>

          <Section title="Photos" desc="First photo is the main image. Use a clean white background for the best look. Images are optimised automatically for mobile data.">
            <ImageUploader images={p.images} onChange={(v) => set('images', v)} />
          </Section>

          <Section title={isLaptop ? 'Specifications' : 'Details'} desc="Shown in the spec table and used for search and filters.">
            <div className="grid gap-4 sm:grid-cols-2">
              {SPEC_FIELDS.filter((f) => isLaptop || ['storage', 'display', 'ports', 'battery', 'weight'].includes(f.key)).map((f) => (
                <Field key={f.key} label={f.label}><input className="input" value={p.specs?.[f.key] || ''} onChange={(e) => setSpec(f.key, e.target.value)} placeholder={SPEC_HINTS[f.key]} /></Field>
              ))}
            </div>
          </Section>

          <Section title="Key highlights" desc="Short selling points shown next to the price (3–5 is ideal).">
            <div className="space-y-2">
              {p.highlights.map((h, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input" value={h} onChange={(e) => set('highlights', p.highlights.map((x, j) => (j === i ? e.target.value : x)))} placeholder="e.g. Battery health 90%+" />
                  <button type="button" onClick={() => set('highlights', p.highlights.filter((_, j) => j !== i))} className="btn-ghost px-2" aria-label="Remove"><X className="h-4 w-4" /></button>
                </div>
              ))}
              <button type="button" onClick={() => set('highlights', [...p.highlights, ''])} className="btn-ghost btn-sm"><Plus className="h-4 w-4" /> Add highlight</button>
            </div>
          </Section>

          <Section title="Description">
            <textarea className="input min-h-[160px]" value={p.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe the product: who it's for, condition details, what's in the box…" />
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Visibility">
            <div className="space-y-4">
              <Toggle checked={p.active} onChange={(v) => set('active', v)} label="Live on store" desc="Hidden products are saved as drafts" />
              <Toggle checked={p.featured} onChange={(v) => set('featured', v)} label="Featured" desc="Show in “Top picks” on the homepage" />
            </div>
          </Section>

          <Section title="Pricing (GH₵)">
            <div className="space-y-4">
              <Field label="Selling price"><input className="input text-lg font-bold" type="number" min="0" step="0.01" inputMode="decimal" value={p.price} onChange={(e) => set('price', e.target.value)} required /></Field>
              <Field label="Was price (optional)" hint="Shows a strike-through & discount badge"><input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={p.compareAtPrice || ''} onChange={(e) => set('compareAtPrice', e.target.value)} /></Field>
              <Field label="Cost price (private)" hint={margin != null ? `Profit: ${money(margin)} (${Math.round((margin / Number(p.price)) * 100)}%)` : 'Only visible to admins, for profit tracking'}><input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={p.costPrice || ''} onChange={(e) => set('costPrice', e.target.value)} /></Field>
            </div>
          </Section>

          <Section title="Inventory">
            <Field label="Quantity in stock"><input className="input" type="number" min="0" inputMode="numeric" value={p.stock} onChange={(e) => set('stock', e.target.value)} /></Field>
            <Field label="Warranty" className="mt-4"><input className="input" value={p.warranty || ''} onChange={(e) => set('warranty', e.target.value)} placeholder={p.condition === 'new' ? '1 year warranty' : '3 months shop warranty'} /></Field>
          </Section>

          {isLaptop && (
            <Section title="Best for" desc="Powers the Laptop Finder and “Shop by need”. Leave empty to auto-detect from specs.">
              <div className="flex flex-wrap gap-2">
                {USE_CASES.map((u) => {
                  const on = p.useCases?.includes(u.key);
                  return <button type="button" key={u.key} onClick={() => set('useCases', on ? p.useCases.filter((x) => x !== u.key) : [...(p.useCases || []), u.key])} className={on ? 'chip-on' : 'chip-off'}>{u.emoji} {u.label}</button>;
                })}
              </div>
            </Section>
          )}

          <Section title="Search tags" desc="Extra words customers might search for">
            <div className="flex flex-wrap gap-1.5">
              {(p.tags || []).map((t) => <span key={t} className="chip bg-slate-100 ring-slate-200">{t}<button type="button" onClick={() => set('tags', p.tags.filter((x) => x !== t))}><X className="h-3 w-3" /></button></span>)}
            </div>
            <input className="input mt-2" value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Type and press Enter"
              onKeyDown={(e) => { if (e.key === 'Enter' && tagInput.trim()) { e.preventDefault(); set('tags', Array.from(new Set([...(p.tags || []), tagInput.trim().toLowerCase()]))); setTagInput(''); } }} />
          </Section>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-1 sm:px-4">
          {dirty && <span className="mr-auto text-sm text-amber-700">Unsaved changes</span>}
          <Link to="/admin/products" className="btn-ghost">Cancel</Link>
          <button disabled={busy} className="btn-primary min-w-32">{busy ? <Spinner /> : <><Save className="h-4 w-4" /> {isNew ? 'Create product' : 'Save changes'}</>}</button>
        </div>
      </div>
    </form>
  );
}
