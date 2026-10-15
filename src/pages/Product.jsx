import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Heart, Share2, ShieldCheck, Truck, RotateCcw, BadgeCheck, MapPin, Check, GitCompareArrows, Bell, Store, ChevronRight, Star } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth, useWishlistIds } from '../context/AuthContext';
import { useCart, useCompare, useRecent, useUI, toast } from '../store';
import { getProduct, fetchProductReviews, addReview, requestRestockAlert } from '../lib/api';
import { conditionOf, SPEC_FIELDS } from '../lib/constants';
import { money, dateShort, discountPct } from '../lib/format';
import { whatsappLink, REGIONS } from '../lib/ghana';
import { WhatsAppIcon } from '../components/WhatsAppFab';
import { ProductRail } from '../components/ProductCard';
import { Img, Price, Stars, StarInput, QtyStepper, ConditionBadge, PageLoader, Empty, Modal, Field, cx } from '../components/ui';
import { PackageX } from 'lucide-react';

function Gallery({ images, name }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const list = images?.length ? images : [{ url: '' }];
  const onScroll = (e) => {
    const el = e.currentTarget;
    setI(Math.round(el.scrollLeft / el.clientWidth));
  };
  return (
    <div className="lg:flex lg:gap-3">
      <div className="hidden w-20 shrink-0 flex-col gap-2 lg:flex">
        {list.map((im, idx) => (
          <button key={idx} onMouseEnter={() => setI(idx)} onClick={() => setI(idx)} className={cx('overflow-hidden rounded-xl bg-white ring-2 transition', i === idx ? 'ring-brand-500' : 'ring-slate-100')}>
            <Img src={im.url} w={160} h={160} fit="contain" className="aspect-square w-full p-1" />
          </button>
        ))}
      </div>
      <div className="relative flex-1">
        {/* mobile: swipeable */}
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto bg-white sm:mx-0 sm:rounded-3xl lg:hidden" onScroll={onScroll}>
          {list.map((im, idx) => (
            <div key={idx} className="w-full shrink-0 snap-center">
              <Img src={im.url} alt={name} w={800} h={800} fit="contain" eager={idx === 0} className="aspect-square w-full p-4" />
            </div>
          ))}
        </div>
        {list.length > 1 && (
          <div className="mt-2 flex justify-center gap-1.5 lg:hidden">
            {list.map((_, idx) => <span key={idx} className={cx('h-1.5 rounded-full transition-all', i === idx ? 'w-5 bg-navy-600' : 'w-1.5 bg-slate-300')} />)}
          </div>
        )}
        {/* desktop */}
        <button onClick={() => setZoom(true)} className="hidden w-full cursor-zoom-in overflow-hidden rounded-3xl bg-white ring-1 ring-slate-900/5 lg:block">
          <Img src={list[i]?.url} alt={name} w={1000} h={1000} fit="contain" eager className="aspect-square w-full p-8" />
        </button>
      </div>
      <Modal open={zoom} onClose={() => setZoom(false)} title={name} size="xl">
        <Img src={list[i]?.url} alt={name} w={1600} fit="contain" className="w-full" />
      </Modal>
    </div>
  );
}

function Reviews({ product }) {
  const { user, profile } = useAuth();
  const [reviews, setReviews] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ rating: 5, title: '', comment: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetchProductReviews(product.id).then(setReviews).catch(() => setReviews([])); }, [product.id]);

  const dist = useMemo(() => {
    const d = [0, 0, 0, 0, 0];
    (reviews || []).forEach((r) => { d[5 - r.rating] += 1; });
    return d;
  }, [reviews]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.comment.trim().length < 10) return toast('Please write at least a short sentence', 'error');
    setBusy(true);
    try {
      await addReview({ productId: product.id, productName: product.name, rating: form.rating, title: form.title.trim(), comment: form.comment.trim(), name: profile?.name || user.displayName || 'Customer' });
      toast('Thanks! Your review will appear after a quick check.');
      setOpen(false);
      setForm({ rating: 5, title: '', comment: '' });
    } catch (err) {
      toast(err.message, 'error');
    } finally { setBusy(false); }
  };

  const total = reviews?.length || 0;
  return (
    <section id="reviews" className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Customer reviews</h2>
        {user ? (
          <button onClick={() => setOpen(true)} className="btn-outline">Write a review</button>
        ) : (
          <Link to={`/login?next=/product/${product.slug}`} className="btn-outline">Sign in to review</Link>
        )}
      </div>
      {total > 0 && (
        <div className="mt-4 grid gap-6 sm:grid-cols-[180px_1fr]">
          <div>
            <div className="text-5xl font-extrabold">{(product.rating || 0).toFixed(1)}</div>
            <Stars value={product.rating} className="mt-1" />
            <div className="mt-1 text-sm text-ink-muted">{total} review{total === 1 ? '' : 's'}</div>
          </div>
          <div className="space-y-1.5">
            {dist.map((n, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span className="flex w-8 items-center gap-0.5">{5 - idx}<Star className="h-3 w-3 fill-amber-400 text-amber-400" /></span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${total ? (n / total) * 100 : 0}%` }} /></div>
                <span className="w-6 text-right text-ink-muted">{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-6 divide-y divide-slate-100">
        {reviews === null ? <p className="text-sm text-ink-muted">Loading reviews…</p> : total === 0 ? (
          <p className="text-sm text-ink-muted">No reviews yet. Bought this item? Be the first to share your experience.</p>
        ) : reviews.map((r) => (
          <article key={r.id} className="py-4">
            <div className="flex items-center gap-2">
              <Stars value={r.rating} size="h-3.5 w-3.5" />
              {r.title && <h3 className="font-semibold">{r.title}</h3>}
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{r.comment}</p>
            <p className="mt-2 text-xs text-ink-muted">{r.name} · {dateShort(r.createdAt)} {r.verified && <span className="ml-1 font-semibold text-emerald-600">✓ Verified purchase</span>}</p>
          </article>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Write a review"
        footer={<button form="review-form" disabled={busy} className="btn-primary w-full sm:w-auto">{busy ? 'Submitting…' : 'Submit review'}</button>}>
        <form id="review-form" onSubmit={submit} className="space-y-4">
          <div><span className="label">Your rating</span><StarInput value={form.rating} onChange={(rating) => setForm({ ...form, rating })} /></div>
          <Field label="Title (optional)"><input className="input" value={form.title} maxLength={80} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Great battery life" /></Field>
          <Field label="Your review"><textarea className="input min-h-[120px]" value={form.comment} maxLength={2000} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="What did you like or dislike? How is the battery, screen, speed?" /></Field>
        </form>
      </Modal>
    </section>
  );
}

export default function Product() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { bySlug, byId, products, settings, loading } = useStore();
  const { toggleWishlist } = useAuth();
  const wishIds = useWishlistIds();
  const add = useCart((s) => s.add);
  const openCart = useUI((s) => s.openCart);
  const pushRecent = useRecent((s) => s.push);
  const { ids: compareIds, toggle: toggleCompare } = useCompare();
  const [fetched, setFetched] = useState(undefined);
  const [qty, setQty] = useState(1);
  const [region, setRegion] = useState(() => localStorage.getItem('gh-region') || 'Greater Accra');
  const [tab, setTab] = useState('specs');
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertContact, setAlertContact] = useState('');

  const p = bySlug[slug] || byId[slug] || fetched;

  useEffect(() => {
    if (!loading && !bySlug[slug] && !byId[slug]) {
      getProduct(slug).then((x) => setFetched(x && x.active ? x : null)).catch(() => setFetched(null));
    }
  }, [slug, loading, bySlug, byId]);

  useEffect(() => {
    if (p) {
      pushRecent(p.id);
      document.title = `${p.name} · ${money(p.price)} · Gadgets Hub`;
      setQty(1);
    }
    return () => { document.title = 'Gadgets Hub · Where Tech Meets Trust'; };
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const related = useMemo(() => {
    if (!p) return { similar: [], addons: [] };
    const similar = products
      .filter((x) => x.id !== p.id && x.category === p.category && x.stock > 0)
      .map((x) => ({ x, score: (x.brand === p.brand ? 2 : 0) + (Math.abs(x.price - p.price) < p.price * 0.25 ? 3 : 0) }))
      .sort((a, b) => b.score - a.score).slice(0, 12).map((s) => s.x);
    const addons = p.category === 'laptops' ? products.filter((x) => x.category !== 'laptops' && x.stock > 0).slice(0, 10) : [];
    return { similar, addons };
  }, [p, products]);

  if (!p) {
    if (loading || fetched === undefined) return <PageLoader />;
    return <div className="container-x"><Empty icon={PackageX} title="Product not found" text="It may have been sold out or removed." action={<Link to="/shop" className="btn-primary">Browse products</Link>} /></div>;
  }

  const cond = conditionOf(p.condition);
  const out = !(p.stock > 0);
  const wished = wishIds.includes(p.id);
  const zone = settings.deliveryZones?.find((z) => z.region === region);
  const off = discountPct(p.price, p.compareAtPrice);
  const specs = SPEC_FIELDS.filter((f) => p.specs?.[f.key]);
  const extraSpecs = Object.entries(p.specs || {}).filter(([k, v]) => v && !SPEC_FIELDS.some((f) => f.key === k));
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const waText = `Hello Gadgets Hub 👋\nI'm interested in: *${p.name}*\nPrice: ${money(p.price)}\nQty: ${qty}\n${url}`;

  const onAdd = () => { add(p, qty); toast('Added to cart', 'success', { label: 'View cart', onClick: openCart }); };
  const onBuy = () => { add(p, qty); navigate('/checkout'); };
  const onShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title: p.name, text: `${p.name} – ${money(p.price)}`, url });
      else { await navigator.clipboard.writeText(url); toast('Link copied'); }
    } catch { /* cancelled */ }
  };
  const submitAlert = async (e) => {
    e.preventDefault();
    if (!alertContact.trim()) return;
    try { await requestRestockAlert(p.id, alertContact.trim()); toast("We'll let you know when it's back"); setAlertOpen(false); } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div className="pb-24 lg:pb-0">
      <div className="container-x py-3 sm:py-6">
        <nav className="mb-3 flex items-center gap-1 overflow-hidden text-xs text-ink-muted">
          <Link to="/" className="shrink-0 hover:text-ink">Home</Link><ChevronRight className="h-3 w-3 shrink-0" />
          <Link to={`/category/${p.category}`} className="shrink-0 capitalize hover:text-ink">{p.category?.replace(/-/g, ' ')}</Link><ChevronRight className="h-3 w-3 shrink-0" />
          <span className="truncate text-ink">{p.name}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
          <div className="lg:sticky lg:top-36 lg:self-start">
            <Gallery images={p.images} name={p.name} />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              {p.brand && <Link to={`/brand/${encodeURIComponent(p.brand)}`} className="text-xs font-bold uppercase tracking-wider text-navy-600 hover:underline">{p.brand}</Link>}
              <ConditionBadge condition={p.condition} />
              {off > 0 && <span className="badge bg-brand-500 text-white ring-brand-500">-{off}%</span>}
            </div>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{p.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              {p.reviewCount > 0 ? (
                <a href="#reviews" className="flex items-center gap-1.5"><Stars value={p.rating} /><span className="font-semibold">{p.rating?.toFixed(1)}</span><span className="text-ink-muted">({p.reviewCount} reviews)</span></a>
              ) : <span className="text-ink-muted">No reviews yet</span>}
              {p.soldCount > 0 && <span className="text-ink-muted">· {p.soldCount}+ sold</span>}
              {p.sku && <span className="text-ink-muted">· SKU {p.sku}</span>}
            </div>

            <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-slate-900/5 sm:p-5">
              <Price price={p.price} compareAt={p.compareAtPrice} size="lg" />
              <div className="mt-2 text-sm">
                {out ? <span className="font-semibold text-rose-600">Out of stock</span>
                  : p.stock <= 3 ? <span className="font-semibold text-rose-600">🔥 Hurry, only {p.stock} left</span>
                    : <span className="flex items-center gap-1.5 font-semibold text-emerald-700"><Check className="h-4 w-4" /> In stock, ready to ship</span>}
              </div>

              {p.highlights?.filter(Boolean).length > 0 && (
                <ul className="mt-4 space-y-1.5 text-sm">
                  {p.highlights.filter(Boolean).map((h) => <li key={h} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{h}</li>)}
                </ul>
              )}

              {!out ? (
                <div className="mt-5 hidden space-y-3 lg:block">
                  <div className="flex items-center gap-3">
                    <QtyStepper value={qty} onChange={setQty} max={p.stock} />
                    <button onClick={onAdd} className="btn-navy btn-lg flex-1">Add to cart</button>
                  </div>
                  <button onClick={onBuy} className="btn-primary btn-lg w-full">Buy now</button>
                </div>
              ) : (
                <button onClick={() => setAlertOpen(true)} className="btn-outline btn-lg mt-5 w-full"><Bell className="h-5 w-5" /> Notify me when available</button>
              )}
              <a href={whatsappLink(settings.whatsapp, waText)} target="_blank" rel="noreferrer" className="btn-wa btn-lg mt-3 w-full">
                <WhatsAppIcon className="h-5 w-5" /> Order or ask on WhatsApp
              </a>
              <div className="mt-3 flex gap-2">
                <button onClick={() => toggleWishlist(p.id)} className={cx('btn-outline flex-1', wished && 'text-rose-600')}><Heart className={cx('h-4 w-4', wished && 'fill-current')} /> {wished ? 'Saved' : 'Save'}</button>
                {p.category === 'laptops' && (
                  <button onClick={() => { toggleCompare(p.id); toast(compareIds.includes(p.id) ? 'Removed from compare' : 'Added to compare', 'info', { label: 'Compare', onClick: () => navigate('/compare') }); }} className={cx('btn-outline flex-1', compareIds.includes(p.id) && 'text-navy-700 ring-navy-300')}>
                    <GitCompareArrows className="h-4 w-4" /> Compare
                  </button>
                )}
                <button onClick={onShare} className="btn-outline flex-1"><Share2 className="h-4 w-4" /> Share</button>
              </div>
            </div>

            <div className="mt-4 divide-y divide-slate-100 rounded-2xl bg-white ring-1 ring-slate-900/5">
              <div className="flex items-start gap-3 p-4">
                <Truck className="mt-0.5 h-5 w-5 shrink-0 text-navy-600" />
                <div className="flex-1 text-sm">
                  <div className="flex flex-wrap items-center gap-1 font-semibold">
                    Deliver to
                    <span className="relative inline-flex items-center">
                      <MapPin className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-navy-600" />
                      <select value={region} onChange={(e) => { setRegion(e.target.value); localStorage.setItem('gh-region', e.target.value); }} className="rounded-lg border-0 bg-navy-50 py-1 pl-6 pr-7 text-sm font-semibold text-navy-800 focus:ring-2 focus:ring-navy-500">
                        {REGIONS.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </span>
                  </div>
                  <p className="mt-1 text-ink-muted">
                    {zone ? <>Arrives <b className="text-ink">{zone.eta}</b> · Delivery {money(zone.fee)}</> : 'Delivery available. Fee confirmed at checkout.'}
                    {settings.freeDeliveryThreshold > 0 && region === 'Greater Accra' && p.price >= settings.freeDeliveryThreshold && <b className="text-emerald-700"> · FREE</b>}
                  </p>
                </div>
              </div>
              {settings.pickupEnabled && (
                <div className="flex items-start gap-3 p-4 text-sm">
                  <Store className="mt-0.5 h-5 w-5 shrink-0 text-navy-600" />
                  <div><div className="font-semibold">Free pickup in store</div><p className="text-ink-muted">{settings.pickupAddress}</p></div>
                </div>
              )}
              <div className="flex items-start gap-3 p-4 text-sm">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div><div className="font-semibold">{p.warranty || (p.condition === 'new' ? '1 year warranty' : '3 months shop warranty')}</div><p className="text-ink-muted">Genuine product, tested before dispatch.</p></div>
              </div>
              <div className="flex items-start gap-3 p-4 text-sm">
                <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                <div><div className="font-semibold">Easy returns</div><p className="text-ink-muted">{settings.returnPolicy}</p></div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-navy-50 p-4 text-sm text-navy-900">
              <div className="flex items-center gap-2 font-semibold"><BadgeCheck className="h-5 w-5" /> {cond.label}</div>
              <p className="mt-1 text-navy-800/80">
                {p.condition === 'new' && 'Sealed in original box with full manufacturer warranty.'}
                {p.condition === 'uk-used' && 'Imported from the UK/US, Grade A condition. Fully tested: battery, keyboard, screen and ports.'}
                {p.condition === 'refurbished' && 'Professionally restored and certified, with replaced parts where needed. Looks and works like new.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
          <div className="space-y-6">
            <section className="card overflow-hidden">
              <div className="flex border-b border-slate-100">
                {[['specs', 'Specifications'], ['desc', 'Description']].map(([k, l]) => (
                  <button key={k} onClick={() => setTab(k)} className={cx('flex-1 px-4 py-3.5 text-sm font-bold', tab === k ? 'border-b-2 border-brand-500 text-ink' : 'text-ink-muted')}>{l}</button>
                ))}
              </div>
              {tab === 'specs' ? (
                specs.length || extraSpecs.length ? (
                  <dl className="divide-y divide-slate-100">
                    {specs.map((f) => (
                      <div key={f.key} className="grid grid-cols-[120px_1fr] gap-3 px-5 py-3 text-sm sm:grid-cols-[160px_1fr]">
                        <dt className="text-ink-muted">{f.label}</dt><dd className="font-medium">{p.specs[f.key]}</dd>
                      </div>
                    ))}
                    {extraSpecs.map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[120px_1fr] gap-3 px-5 py-3 text-sm sm:grid-cols-[160px_1fr]">
                        <dt className="capitalize text-ink-muted">{k}</dt><dd className="font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : <p className="p-5 text-sm text-ink-muted">Specifications coming soon. Ask us on WhatsApp.</p>
              ) : (
                <div className="whitespace-pre-line p-5 text-sm leading-relaxed text-ink-soft">{p.description || 'No description yet.'}</div>
              )}
            </section>
          </div>
          <Reviews product={p} />
        </div>

        {related.addons.length > 0 && (
          <section className="mt-12">
            <h2 className="section-title mb-4">Complete your setup</h2>
            <ProductRail products={related.addons} />
          </section>
        )}
        {related.similar.length > 0 && (
          <section className="mt-12">
            <h2 className="section-title mb-4">Similar items</h2>
            <ProductRail products={related.similar} />
          </section>
        )}
      </div>

      {/* Mobile sticky buy bar */}
      <div className="fixed inset-x-0 bottom-[60px] z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        {out ? (
          <button onClick={() => setAlertOpen(true)} className="btn-outline w-full"><Bell className="h-4 w-4" /> Notify me when available</button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="mr-1 min-w-0">
              <div className="text-[11px] text-ink-muted">Total</div>
              <div className="truncate text-base font-extrabold">{money(p.price * qty)}</div>
            </div>
            <button onClick={onAdd} className="btn-navy flex-1 px-2">Add to cart</button>
            <button onClick={onBuy} className="btn-primary flex-1 px-2">Buy now</button>
          </div>
        )}
      </div>

      <Modal open={alertOpen} onClose={() => setAlertOpen(false)} title="Get notified" size="sm"
        footer={<button form="alert-form" className="btn-primary w-full sm:w-auto">Notify me</button>}>
        <form id="alert-form" onSubmit={submitAlert} className="space-y-3">
          <p className="text-sm text-ink-muted">We'll send you a message as soon as <b>{p.name}</b> is back in stock.</p>
          <Field label="Phone (WhatsApp) or email"><input className="input" value={alertContact} onChange={(e) => setAlertContact(e.target.value)} placeholder="024 123 4567" required /></Field>
        </form>
      </Modal>
    </div>
  );
}
