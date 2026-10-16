import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Smartphone, Truck, BadgeCheck, ChevronLeft, ChevronRight, Sparkles, Zap, Store, MessageCircle, Wallet, PackageCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { useRecent } from '../store';
import { USE_CASES } from '../lib/constants';
import { PRICE_BANDS } from '../lib/search';
import { whatsappLink } from '../lib/ghana';
import { ProductRail, ProductGrid } from '../components/ProductCard';
import CategoryIcon from '../components/CategoryIcon';
import { WhatsAppIcon } from '../components/WhatsAppFab';
import { Img, Countdown, ProductCardSkeleton, cx } from '../components/ui';

function SectionHead({ title, sub, to, cta = 'See all' }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="section-title">{title}</h2>
        {sub && <p className="mt-1 text-sm text-ink-muted">{sub}</p>}
      </div>
      {to && <Link to={to} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-navy-600 hover:text-navy-800">{cta} <ArrowRight className="h-4 w-4" /></Link>}
    </div>
  );
}

function DefaultHero() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-navy-900 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(242,138,30,.45),transparent_45%),radial-gradient(circle_at_10%_90%,rgba(46,93,182,.6),transparent_50%)]" />
      <div className="relative grid items-center gap-6 p-6 sm:p-10 lg:grid-cols-2 lg:p-14">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
            <BadgeCheck className="h-4 w-4 text-brand-300" /> Trusted by thousands across Ghana
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
            Genuine laptops.<br /><span className="text-brand-400">Honest prices.</span><br />Delivered to your door.
          </h1>
          <p className="mt-4 max-w-md text-base text-slate-300 sm:text-lg">
            Brand new, UK-used and certified refurbished laptops with real warranty. Pay with MoMo or on delivery.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/category/laptops" className="btn-primary btn-lg">Shop laptops <ArrowRight className="h-5 w-5" /></Link>
            <Link to="/finder" className="btn btn-lg bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20"><Sparkles className="h-5 w-5" /> Help me choose</Link>
          </div>
        </div>
        <div className="relative hidden lg:block">
          <img src="/icon-512.png" alt="" className="mx-auto w-80 drop-shadow-2xl" />
        </div>
      </div>
    </div>
  );
}

function HeroCarousel({ banners }) {
  const [i, setI] = useState(0);
  const timer = useRef();
  const n = banners.length;
  useEffect(() => {
    if (n < 2) return undefined;
    timer.current = setInterval(() => setI((x) => (x + 1) % n), 6000);
    return () => clearInterval(timer.current);
  }, [n]);
  if (!n) return <DefaultHero />;
  const go = (d) => { clearInterval(timer.current); setI((x) => (x + d + n) % n); };
  return (
    <div className="relative overflow-hidden rounded-3xl bg-navy-900">
      <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
        {banners.map((b, idx) => (
          <Link key={idx} to={b.link || '/shop'} className="relative block w-full shrink-0">
            <Img src={b.image} alt={b.title} w={1400} h={560} eager={idx === 0} className="aspect-[16/10] w-full sm:aspect-[21/9] lg:aspect-[5/2]" />
            {(b.title || b.subtitle) && (
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-navy-950/85 via-navy-950/25 to-transparent p-5 sm:items-center sm:bg-gradient-to-r sm:p-12">
                <div className="max-w-lg text-white">
                  {b.title && <h2 className="font-display text-3xl font-bold leading-tight sm:text-5xl">{b.title}</h2>}
                  {b.subtitle && <p className="mt-2 text-sm text-slate-200 sm:text-lg">{b.subtitle}</p>}
                  {b.cta && <span className="btn-primary mt-4">{b.cta} <ArrowRight className="h-4 w-4" /></span>}
                </div>
              </div>
            )}
          </Link>
        ))}
      </div>
      {n > 1 && (
        <>
          <button onClick={() => go(-1)} className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 shadow sm:block" aria-label="Previous"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={() => go(1)} className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 shadow sm:block" aria-label="Next"><ChevronRight className="h-5 w-5" /></button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, idx) => (
              <button key={idx} onClick={() => setI(idx)} className={cx('h-1.5 rounded-full transition-all', idx === i ? 'w-6 bg-white' : 'w-1.5 bg-white/50')} aria-label={`Slide ${idx + 1}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const TRUST = [
  { icon: ShieldCheck, title: 'Genuine & tested', text: 'Every laptop checked before dispatch' },
  { icon: BadgeCheck, title: 'Real warranty', text: 'Up to 1 year, honoured in-shop' },
  { icon: Smartphone, title: 'Pay with MoMo', text: 'MTN, Telecel, AT or on delivery' },
  { icon: Truck, title: 'Nationwide delivery', text: 'Same-day in Accra, all 16 regions' },
];

export default function Home() {
  const { products, categories, home, settings, loading, byId } = useStore();
  const { isStaff } = useAuth();
  const recentIds = useRecent((s) => s.ids);

  const s = useMemo(() => {
    const inStock = products.filter((p) => p.stock > 0);
    const laptops = inStock.filter((p) => p.category === 'laptops');
    const flashIds = home.flashSale?.productIds || [];
    return {
      featured: inStock.filter((p) => p.featured).slice(0, 12),
      best: [...inStock].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0)).slice(0, 12),
      newest: [...products].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 10),
      deals: inStock.filter((p) => p.compareAtPrice > p.price).sort((a, b) => (b.compareAtPrice - b.price) / b.compareAtPrice - (a.compareAtPrice - a.price) / a.compareAtPrice).slice(0, 12),
      accessories: inStock.filter((p) => p.category !== 'laptops').slice(0, 12),
      flash: flashIds.map((id) => byId[id]).filter(Boolean),
      laptops,
    };
  }, [products, home, byId]);

  const recent = recentIds.map((id) => byId[id]).filter(Boolean);
  const flashLive = home.flashSale?.enabled && s.flash.length > 0 && (!home.flashSale.endsAt || (home.flashSale.endsAt.toDate?.() || new Date(home.flashSale.endsAt)) > new Date());
  const brands = (home.featuredBrands || []).filter(Boolean);
  const visibleCats = categories.filter((c) => !c.hidden);

  return (
    <div className="space-y-10 pb-6 pt-4 sm:space-y-14 sm:pt-6">
      <section className="container-x">
        <HeroCarousel banners={home.banners || []} />
      </section>

      <section className="container-x">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {TRUST.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-900/5 sm:p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 sm:h-12 sm:w-12"><Icon className="h-5 w-5 sm:h-6 sm:w-6" /></div>
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight">{title}</div>
                <div className="hidden text-xs text-ink-muted sm:block">{text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {visibleCats.length > 0 && (
        <section className="container-x">
          <SectionHead title="Shop by category" to="/categories" />
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-8">
            {visibleCats.map((c) => (
              <Link key={c.id} to={`/category/${c.slug}`} className="group flex w-24 shrink-0 flex-col items-center gap-2 sm:w-auto">
                <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-white text-navy-600 ring-1 ring-slate-900/5 transition group-hover:-translate-y-0.5 group-hover:shadow-card group-hover:ring-brand-300">
                  {c.image ? <Img src={c.image} w={200} h={200} className="h-full w-full" alt={c.name} /> : <CategoryIcon slug={c.slug} className="h-9 w-9" />}
                </div>
                <span className="text-center text-xs font-semibold leading-tight sm:text-sm">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {flashLive && (
        <section className="container-x">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-white">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold sm:text-3xl"><Zap className="h-7 w-7 fill-current" /> {home.flashSale.title || 'Flash Sale'}</h2>
              {home.flashSale.endsAt && <div className="flex items-center gap-2 text-sm font-semibold">Ends in <Countdown to={home.flashSale.endsAt} /></div>}
            </div>
            <ProductRail products={s.flash} />
          </div>
        </section>
      )}

      <section className="container-x">
        <SectionHead title="What will you use it for?" sub="Tell us your need. We'll show laptops that fit." to="/finder" cta="Laptop finder" />
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-5 sm:px-0">
          {USE_CASES.map((u) => (
            <Link key={u.key} to={`/shop?use=${u.key}`} className="card w-40 shrink-0 p-4 transition hover:-translate-y-0.5 hover:ring-brand-300 sm:w-auto">
              <div className="text-3xl">{u.emoji}</div>
              <div className="mt-2 font-bold">{u.label}</div>
              <div className="text-xs text-ink-muted">{u.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {loading ? (
        <section className="container-x">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
        </section>
      ) : products.length === 0 ? (
        <section className="container-x">
          <div className="card p-10 text-center">
            <h2 className="text-xl font-bold">Our shelves are being stocked 📦</h2>
            <p className="mt-2 text-ink-muted">New laptops and accessories are arriving soon. Chat with us on WhatsApp for what's available today.</p>
            {isStaff && <Link to="/admin/products" className="btn-primary mt-5">Add products in admin</Link>}
          </div>
        </section>
      ) : (
        <>
          {(s.featured.length ? s.featured : s.best).length > 0 && (
            <section className="container-x">
              <SectionHead title={s.featured.length ? 'Top picks for you' : 'Best sellers'} sub="Hand-picked by our tech team" to="/shop?sort=popular" />
              <ProductRail products={s.featured.length ? s.featured : s.best} />
            </section>
          )}

          {s.deals.length > 0 && !flashLive && (
            <section className="container-x">
              <SectionHead title="🔥 Hot deals" sub="Big savings on top brands" to="/deals" />
              <ProductRail products={s.deals} />
            </section>
          )}

          {brands.length > 0 && (
            <section className="container-x">
              <SectionHead title="Shop by brand" />
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-3">
                {brands.map((b) => (
                  <Link key={b} to={`/brand/${encodeURIComponent(b)}`} className="flex h-16 items-center justify-center rounded-2xl bg-white px-2 text-center font-display text-base font-bold tracking-wide text-ink-soft ring-1 ring-slate-900/5 transition hover:text-navy-700 hover:ring-navy-300 sm:h-20 sm:text-lg">
                    {b}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="container-x">
            <SectionHead title="Shop by budget" sub="Great laptops at every price" />
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-5 sm:px-0">
              {PRICE_BANDS.map((b, i) => (
                <Link key={b.value} to={`/category/laptops?price=${b.value}`}
                  className={cx('flex w-44 shrink-0 flex-col justify-between rounded-2xl p-4 text-white transition hover:-translate-y-0.5 sm:w-auto',
                    ['bg-navy-600', 'bg-navy-700', 'bg-navy-800', 'bg-brand-600', 'bg-brand-700'][i])}>
                  <Wallet className="h-6 w-6 opacity-80" />
                  <span className="mt-6 text-lg font-bold leading-tight">{b.label}</span>
                </Link>
              ))}
            </div>
          </section>

          {s.newest.length > 0 && (
            <section className="container-x">
              <SectionHead title="New arrivals" sub="Fresh stock just landed" to="/shop?sort=newest" />
              <ProductGrid products={s.newest} />
            </section>
          )}

          {s.accessories.length > 0 && (
            <section className="container-x">
              <SectionHead title="Accessories you'll need" sub="Chargers, bags, mice and more" to="/shop?cat=accessories" />
              <ProductRail products={s.accessories} />
            </section>
          )}

          {recent.length > 0 && (
            <section className="container-x">
              <SectionHead title="Recently viewed" />
              <ProductRail products={recent} />
            </section>
          )}
        </>
      )}

      <section className="container-x">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card p-6 lg:col-span-2">
            <h2 className="section-title">How buying works</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              {[
                { icon: Store, t: '1. Choose', d: 'Browse, compare and add to cart, or ask us on WhatsApp.' },
                { icon: Wallet, t: '2. Pay your way', d: 'MoMo, card, manual MoMo transfer or pay on delivery.' },
                { icon: PackageCheck, t: '3. Receive & enjoy', d: 'Track your order. Inspect it on arrival. Warranty included.' },
              ].map(({ icon: Icon, t, d }) => (
                <div key={t}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><Icon className="h-5 w-5" /></div>
                  <div className="mt-3 font-bold">{t}</div>
                  <p className="mt-1 text-sm text-ink-muted">{d}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-2xl bg-[#075E54] p-6 text-white">
            <div>
              <MessageCircle className="h-8 w-8 text-[#25D366]" />
              <h3 className="mt-3 text-xl font-bold">Not sure what to buy?</h3>
              <p className="mt-1 text-sm text-emerald-100">Chat with a real person. We'll recommend the right laptop for your budget in minutes.</p>
            </div>
            <a href={whatsappLink(settings.whatsapp, 'Hello Gadgets Hub 👋, please help me choose a laptop. My budget is GH₵')} target="_blank" rel="noreferrer" className="btn-wa mt-5 w-full">
              <WhatsAppIcon className="h-5 w-5" /> Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
