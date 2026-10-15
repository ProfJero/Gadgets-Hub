import { useRef, useState } from 'react';
import { UploadCloud, X, ArrowLeft, ArrowRight, Star, Link2, Search } from 'lucide-react';
import { uploadImage, cloudinaryReady } from '../../lib/cloudinary';
import { Img, Modal, cx } from '../../components/ui';
import { money } from '../../lib/format';
import { toast } from '../../store';

export function PageHeader({ title, sub, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, icon: Icon, tone = 'bg-navy-50 text-navy-700' }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
          <p className="mt-1.5 truncate text-2xl font-extrabold tracking-tight sm:text-3xl">{value}</p>
          {sub && <p className="mt-1 text-xs text-ink-muted">{sub}</p>}
        </div>
        {Icon && <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone)}><Icon className="h-5 w-5" /></span>}
      </div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input !py-2 pl-9" />
    </div>
  );
}

/** Multi-image uploader to Cloudinary with progress, reorder and URL paste. */
export function ImageUploader({ images = [], onChange, folder = 'gadgets-hub/products', max = 10, single = false }) {
  const input = useRef();
  const [uploads, setUploads] = useState([]);
  const [drag, setDrag] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [url, setUrl] = useState('');

  const handle = async (files) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, single ? 1 : max - images.length);
    if (!list.length) return;
    if (!cloudinaryReady()) {
      toast('Set up Cloudinary in Settings → Integrations first', 'error');
      return;
    }
    let current = single ? [] : [...images];
    await Promise.all(list.map(async (file) => {
      const key = `${file.name}-${Math.random()}`;
      setUploads((u) => [...u, { key, name: file.name, pct: 0 }]);
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is larger than 10MB`);
        const res = await uploadImage(file, { folder, onProgress: (pct) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, pct } : x))) });
        current = [...current, { url: res.url, publicId: res.publicId }];
        onChange(current);
      } catch (e) {
        toast(e.message, 'error');
      } finally {
        setUploads((u) => u.filter((x) => x.key !== key));
      }
    }));
  };

  const move = (i, d) => {
    const next = [...images];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };

  return (
    <div>
      <div className={cx('grid gap-3', single ? 'grid-cols-1' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5')}>
        {images.map((im, i) => (
          <div key={im.url + i} className="group relative overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <Img src={im.url} w={300} h={single ? 160 : 300} fit={single ? 'cover' : 'contain'} className={cx('w-full', single ? 'aspect-[5/2]' : 'aspect-square p-1')} />
            {i === 0 && !single && <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-md bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white"><Star className="h-3 w-3 fill-current" /> Main</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
              {!single && <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-md bg-white/90 p-1 disabled:opacity-30" aria-label="Move left"><ArrowLeft className="h-3.5 w-3.5" /></button>}
              <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} className="rounded-md bg-rose-600 p-1 text-white" aria-label="Remove"><X className="h-3.5 w-3.5" /></button>
              {!single && <button type="button" disabled={i === images.length - 1} onClick={() => move(i, 1)} className="rounded-md bg-white/90 p-1 disabled:opacity-30" aria-label="Move right"><ArrowRight className="h-3.5 w-3.5" /></button>}
            </div>
          </div>
        ))}
        {uploads.map((u) => (
          <div key={u.key} className={cx('flex flex-col items-center justify-center rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200', single ? 'aspect-[5/2]' : 'aspect-square')}>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-navy-600 transition-all" style={{ width: `${u.pct}%` }} /></div>
            <span className="mt-1 text-xs text-ink-muted">{u.pct}%</span>
          </div>
        ))}
        {(single ? images.length === 0 && uploads.length === 0 : images.length + uploads.length < max) && (
          <button
            type="button"
            onClick={() => input.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files); }}
            className={cx('flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-3 text-center text-xs font-semibold transition', single ? 'aspect-[5/2]' : 'aspect-square',
              drag ? 'border-navy-500 bg-navy-50 text-navy-700' : 'border-slate-300 text-ink-muted hover:border-navy-400 hover:text-navy-700')}
          >
            <UploadCloud className="h-6 w-6" /> {single ? 'Upload image' : 'Add photos'}
            <span className="font-normal">Drag & drop or tap</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple={!single} hidden onChange={(e) => { handle(e.target.files); e.target.value = ''; }} />
      <button type="button" onClick={() => setUrlOpen(true)} className="mt-2 flex items-center gap-1 text-xs font-semibold text-navy-600"><Link2 className="h-3.5 w-3.5" /> Add from URL</button>
      <Modal open={urlOpen} onClose={() => setUrlOpen(false)} title="Add image from URL" size="sm"
        footer={<button className="btn-primary" onClick={() => { if (url.trim()) { onChange(single ? [{ url: url.trim() }] : [...images, { url: url.trim() }]); setUrl(''); setUrlOpen(false); } }}>Add</button>}>
        <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://res.cloudinary.com/…" />
      </Modal>
    </div>
  );
}

export function ProductPicker({ open, onClose, products, selected = [], onChange }) {
  const [q, setQ] = useState('');
  const list = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 60);
  return (
    <Modal open={open} onClose={onClose} title="Choose products" size="lg" footer={<button onClick={onClose} className="btn-primary">Done ({selected.length})</button>}>
      <SearchInput value={q} onChange={setQ} className="mb-3" />
      <ul className="divide-y divide-slate-100">
        {list.map((p) => {
          const on = selected.includes(p.id);
          return (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-3 py-2">
                <input type="checkbox" checked={on} onChange={() => onChange(on ? selected.filter((x) => x !== p.id) : [...selected, p.id])} className="rounded border-slate-300 text-navy-600" />
                <Img src={p.images?.[0]?.url} w={80} h={80} fit="contain" className="h-10 w-10 rounded-lg ring-1 ring-slate-100" />
                <span className="flex-1 text-sm">{p.name}</span>
                <span className="text-sm font-semibold">{money(p.price)}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

export const downloadCSV = (filename, rows) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};
