import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Star, X, Loader2, Minus, Plus, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { img } from '../lib/cloudinary';
import { money, discountPct } from '../lib/format';
import { conditionOf } from '../lib/constants';
import { usePrefs, useUI } from '../store';

export const cx = (...c) => c.filter(Boolean).join(' ');

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={cx('animate-spin', className)} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-navy-600">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

/** Lazy, right-sized image. Honours data-saver mode. */
export function Img({ src, alt = '', w = 600, h, className, eager, fit = 'cover', ...rest }) {
  const dataSaver = usePrefs((s) => s.dataSaver);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const width = dataSaver ? Math.round(w * 0.6) : w;
  const height = h ? (dataSaver ? Math.round(h * 0.6) : h) : undefined;
  const url = img(src, { w: width, h: height, q: dataSaver ? 'auto:eco' : 'auto' });
  if (!src || failed) {
    return (
      <div className={cx('flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400', className)} aria-label={alt}>
        <svg viewBox="0 0 24 24" className="h-1/3 w-1/3 max-h-16 max-w-16" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2 19h20" /></svg>
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={cx(className, fit === 'contain' ? 'object-contain' : 'object-cover', 'transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
      {...rest}
    />
  );
}

export function Price({ price, compareAt, size = 'md', className }) {
  const off = discountPct(price, compareAt);
  const sizes = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl sm:text-3xl' };
  return (
    <div className={cx('flex flex-wrap items-baseline gap-x-2', className)}>
      <span className={cx('font-extrabold tracking-tight text-ink', sizes[size])}>{money(price)}</span>
      {off > 0 && (
        <>
          <span className="text-sm text-ink-muted line-through">{money(compareAt)}</span>
          {size === 'lg' && <span className="badge bg-brand-50 text-brand-700 ring-brand-200">Save {money(compareAt - price)}</span>}
        </>
      )}
    </div>
  );
}

export function Stars({ value = 0, size = 'h-4 w-4', className }) {
  return (
    <div className={cx('flex items-center', className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cx(size, i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200')} />
      ))}
    </div>
  );
}

export function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button type="button" key={i} onMouseEnter={() => setHover(i)} onClick={() => onChange(i)} aria-label={`${i} stars`} className="p-0.5">
          <Star className={cx('h-8 w-8 transition', i <= (hover || value) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200')} />
        </button>
      ))}
    </div>
  );
}

export function ConditionBadge({ condition, className }) {
  const c = conditionOf(condition);
  return <span className={cx('badge', c.tone, className)}>{c.short}</span>;
}

export function Badge({ tone = 'bg-slate-100 text-slate-700 ring-slate-200', children, className }) {
  return <span className={cx('badge', tone, className)}>{children}</span>;
}

export function QtyStepper({ value, onChange, max = 99, min = 1, size = 'md' }) {
  const s = size === 'sm' ? 'h-8 w-8' : 'h-11 w-11';
  return (
    <div className="inline-flex items-center rounded-xl bg-white ring-1 ring-slate-300">
      <button type="button" className={cx(s, 'flex items-center justify-center text-ink-soft disabled:opacity-30')} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity">
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-8 text-center text-sm font-bold tabular-nums">{value}</span>
      <button type="button" className={cx(s, 'flex items-center justify-center text-ink-soft disabled:opacity-30')} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function useLockScroll(open) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);
}

function useEsc(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
}

/** Bottom sheet on mobile, centred dialog on desktop. */
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useLockScroll(open);
  useEsc(open, onClose);
  if (!open) return null;
  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cx('relative flex max-h-[92vh] w-full animate-slide-up flex-col rounded-t-3xl bg-white shadow-lift sm:animate-fade-in sm:rounded-2xl', widths[size])}>
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="btn-ghost -mr-2 p-2" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3 pb-safe">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({ open, onClose, title, children, footer, side = 'right', width = 'max-w-md' }) {
  useLockScroll(open);
  useEsc(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cx('absolute top-0 flex h-full w-full flex-col bg-white shadow-lift', width, side === 'right' ? 'right-0 animate-slide-left' : 'left-0')}>
        {title !== undefined && (
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="text-lg font-bold">{title}</div>
            <button onClick={onClose} className="btn-ghost -mr-2 p-2" aria-label="Close"><X className="h-5 w-5" /></button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-slate-100 p-4 pb-safe">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-50 text-navy-600">
          <Icon className="h-8 w-8" />
        </div>
      )}
      <h3 className="text-lg font-bold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-muted">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Field({ label, error, hint, children, className }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="label">{label}</span>}
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span> : hint ? <span className="mt-1 block text-xs text-ink-muted">{hint}</span> : null}
    </label>
  );
}

export function Toggle({ checked, onChange, label, desc }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {desc && <span className="block text-xs text-ink-muted">{desc}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx('relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-navy-600' : 'bg-slate-300')}
      >
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </label>
  );
}

export function Toaster() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismiss);
  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
  const tones = { success: 'text-emerald-400', error: 'text-rose-400', info: 'text-sky-300' };
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {toasts.map((t) => {
        const Icon = icons[t.type] || Info;
        return (
          <div key={t.id} className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lift">
            <Icon className={cx('h-5 w-5 shrink-0', tones[t.type])} />
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button className="font-bold text-brand-300" onClick={() => { t.action.onClick(); dismiss(t.id); }}>{t.action.label}</button>
            )}
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

export function Skeleton({ className }) {
  return <div className={cx('skeleton', className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden p-3">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <Skeleton className="mt-3 h-3 w-1/3" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-1.5 h-4 w-2/3" />
      <Skeleton className="mt-3 h-5 w-1/2" />
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cx('no-scrollbar flex gap-1 overflow-x-auto border-b border-slate-200', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cx('relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition',
            value === t.value ? 'text-navy-700' : 'text-ink-muted hover:text-ink')}
        >
          {t.label}
          {t.count != null && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-ink-soft">{t.count}</span>}
          {value === t.value && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-navy-600" />}
        </button>
      ))}
    </div>
  );
}

export function useDebounced(value, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function Countdown({ to, className }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const end = to?.toDate ? to.toDate().getTime() : new Date(to).getTime();
  const diff = Math.max(0, end - now);
  const parts = [Math.floor(diff / 86400000), Math.floor(diff / 3600000) % 24, Math.floor(diff / 60000) % 60, Math.floor(diff / 1000) % 60];
  const labels = ['d', 'h', 'm', 's'];
  return (
    <div className={cx('flex items-center gap-1 font-mono tabular-nums', className)}>
      {parts.map((p, i) => (i === 0 && p === 0 ? null : (
        <span key={i} className="rounded-md bg-white/15 px-1.5 py-0.5 text-sm font-bold">{String(p).padStart(2, '0')}{labels[i]}</span>
      )))}
    </div>
  );
}
