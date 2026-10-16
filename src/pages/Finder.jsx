import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, RotateCcw } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { USE_CASES, CONDITIONS } from '../lib/constants';
import { fitsUse, parseGb } from '../lib/search';
import { money } from '../lib/format';
import { ProductGrid } from '../components/ProductCard';
import { cx } from '../components/ui';

const BUDGETS = [
  { label: 'Under GH₵3,000', max: 3000 },
  { label: 'GH₵3,000 – 6,000', min: 3000, max: 6000 },
  { label: 'GH₵6,000 – 10,000', min: 6000, max: 10000 },
  { label: 'GH₵10,000 – 20,000', min: 10000, max: 20000 },
  { label: 'Above GH₵20,000', min: 20000 },
];
const PRIORITIES = [
  { key: 'battery', label: '🔋 Long battery life' },
  { key: 'light', label: '🪶 Light & portable' },
  { key: 'power', label: '⚡ Maximum speed' },
  { key: 'screen', label: '🖥️ Big screen' },
  { key: 'value', label: '💰 Best value' },
];

export default function Finder() {
  const { products } = useStore();
  const [step, setStep] = useState(0);
  const [a, setA] = useState({ use: '', budget: null, cond: '', priority: '' });

  const results = useMemo(() => {
    let r = products.filter((p) => p.category === 'laptops' && p.stock > 0);
    if (a.use) r = r.filter((p) => fitsUse(p, a.use));
    if (a.budget) r = r.filter((p) => (a.budget.min == null || p.price >= a.budget.min * 0.9) && (a.budget.max == null || p.price <= a.budget.max * 1.1));
    if (a.cond) r = r.filter((p) => p.condition === a.cond);
    const score = (p) => {
      const ram = parseGb(p.specs?.ram);
      const screen = parseFloat(p.specs?.display) || 14;
      const weight = parseFloat(p.specs?.weight) || 1.8;
      switch (a.priority) {
        case 'power': return ram * 10 - p.price / 1000;
        case 'screen': return screen;
        case 'light': return -weight;
        case 'battery': return /m[1-4]|ultra|snapdragon/i.test(p.specs?.processor || '') ? 10 : parseFloat(p.specs?.battery) || 0;
        case 'value': return (p.rating || 3) * 2 - p.price / 2000;
        default: return p.soldCount || 0;
      }
    };
    return r.sort((x, y) => score(y) - score(x)).slice(0, 8);
  }, [products, a]);

  const questions = [
    { title: 'What will you mainly use it for?', key: 'use', options: USE_CASES.map((u) => ({ value: u.key, label: `${u.emoji} ${u.label}`, desc: u.desc })) },
    { title: "What's your budget?", key: 'budget', options: BUDGETS.map((b) => ({ value: b, label: b.label })) },
    { title: 'Which condition do you prefer?', key: 'cond', options: [{ value: '', label: 'No preference', desc: 'Show me the best options' }, ...CONDITIONS.map((c) => ({ value: c.value, label: c.label }))] },
    { title: 'What matters most to you?', key: 'priority', options: PRIORITIES.map((p) => ({ value: p.key, label: p.label })) },
  ];
  const q = questions[step];
  const pick = (v) => { setA({ ...a, [q.key]: v }); setStep(step + 1); };

  return (
    <div className="container-x py-6">
      {step < questions.length ? (
        <div className="mx-auto max-w-xl">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-600"><Sparkles className="h-4 w-4" /> Laptop finder · {step + 1} of {questions.length}</div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div>
          <h1 className="mt-6 font-display text-3xl font-bold">{q.title}</h1>
          <div className="mt-5 grid gap-3">
            {q.options.map((o) => (
              <button key={o.label} onClick={() => pick(o.value)} className={cx('card flex items-center justify-between p-4 text-left transition hover:ring-2 hover:ring-brand-400')}>
                <span><span className="block font-semibold">{o.label}</span>{o.desc && <span className="text-sm text-ink-muted">{o.desc}</span>}</span>
              </button>
            ))}
          </div>
          {step > 0 && <button onClick={() => setStep(step - 1)} className="btn-ghost mt-4"><ArrowLeft className="h-4 w-4" /> Back</button>}
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-600"><Sparkles className="h-4 w-4" /> Your matches</div>
              <h1 className="mt-1 font-display text-3xl font-bold">{results.length ? `We found ${results.length} great laptop${results.length > 1 ? 's' : ''} for you` : 'No exact matches right now'}</h1>
              <p className="mt-1 text-sm text-ink-muted">{USE_CASES.find((u) => u.key === a.use)?.label} · {a.budget?.label}{a.cond && ` · ${CONDITIONS.find((c) => c.value === a.cond)?.label}`}</p>
            </div>
            <button onClick={() => { setStep(0); setA({ use: '', budget: null, cond: '', priority: '' }); }} className="btn-outline"><RotateCcw className="h-4 w-4" /> Start over</button>
          </div>
          {results.length ? <ProductGrid products={results} className="mt-6" /> : (
            <div className="card mt-6 p-8 text-center">
              <p className="text-ink-muted">Try a different budget or condition, or <Link to="/category/laptops" className="link">browse all laptops</Link>. You can also chat with us. We often have stock not yet listed online.</p>
              {a.budget && <p className="mt-2 text-sm">Your budget: {a.budget.min ? money(a.budget.min) : ''}{a.budget.max ? ` – ${money(a.budget.max)}` : '+'}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
