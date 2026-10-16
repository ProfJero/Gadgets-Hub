import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, MailCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isValidGhPhone, normalizePhone } from '../lib/ghana';
import { Field, Spinner } from '../components/ui';
import { toast } from '../store';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" /></svg>
);

export default function Auth({ mode }) {
  const { login, register, loginGoogle, resetPassword, user, isStaff } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const next = sp.get('next') || '';
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (user && mode !== 'forgot') navigate(next || (isStaff ? '/admin' : '/account'), { replace: true });
  }, [user, isStaff]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (mode === 'register') {
      if (f.name.trim().length < 2) return setErr('Please enter your name');
      if (f.phone && !isValidGhPhone(f.phone)) return setErr('Please enter a valid Ghana phone number');
    }
    setBusy(true);
    try {
      if (mode === 'login') await login(f.email, f.password);
      else if (mode === 'register') { await register({ ...f, name: f.name.trim(), phone: normalizePhone(f.phone) }); toast('Welcome to Gadgets Hub! 🎉'); }
      else { await resetPassword(f.email); setSent(true); }
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  const google = async () => {
    setErr('');
    try { await loginGoogle(); } catch (e) { setErr(e.message); }
  };

  const titles = { login: 'Welcome back', register: 'Create your account', forgot: 'Reset your password' };
  const subs = { login: 'Sign in to track orders and checkout faster.', register: 'Save addresses, track orders and keep your wishlist on every device.', forgot: "Enter your email and we'll send a reset link." };

  return (
    <div className="container-x flex max-w-md flex-col py-10">
      <div className="card p-6 sm:p-8">
        <h1 className="font-display text-3xl font-bold">{titles[mode]}</h1>
        <p className="mt-1 text-sm text-ink-muted">{subs[mode]}</p>
        {sent ? (
          <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-center text-emerald-800">
            <MailCheck className="mx-auto h-10 w-10" />
            <p className="mt-2 font-semibold">Check your email</p>
            <p className="text-sm">We sent a reset link to {f.email}. Check spam if you don't see it.</p>
            <Link to="/login" className="btn-navy mt-4">Back to sign in</Link>
          </div>
        ) : (
          <>
            {mode !== 'forgot' && (
              <>
                <button onClick={google} className="btn-outline btn-lg mt-6 w-full"><GoogleIcon /> Continue with Google</button>
                <div className="my-5 flex items-center gap-3 text-xs text-ink-muted"><span className="h-px flex-1 bg-slate-200" /> or with email <span className="h-px flex-1 bg-slate-200" /></div>
              </>
            )}
            <form onSubmit={submit} className={mode === 'forgot' ? 'mt-6 space-y-4' : 'space-y-4'}>
              {mode === 'register' && (
                <>
                  <Field label="Full name"><input className="input" value={f.name} onChange={set('name')} autoComplete="name" required /></Field>
                  <Field label="Phone number (optional)"><input className="input" type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="024 123 4567" autoComplete="tel" /></Field>
                </>
              )}
              <Field label="Email"><input className="input" type="email" inputMode="email" value={f.email} onChange={set('email')} autoComplete="email" required /></Field>
              {mode !== 'forgot' && (
                <Field label={<span className="flex justify-between">Password {mode === 'login' && <Link to="/forgot" className="link text-xs">Forgot?</Link>}</span>}>
                  <div className="relative">
                    <input className="input pr-11" type={show ? 'text' : 'password'} value={f.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} required />
                    <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink-muted" aria-label="Show password">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  </div>
                </Field>
              )}
              {err && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
              <button disabled={busy} className="btn-primary btn-lg w-full">{busy ? <Spinner /> : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}</button>
            </form>
            <p className="mt-6 text-center text-sm text-ink-muted">
              {mode === 'login' ? <>New to Gadgets Hub? <Link to={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="link">Create an account</Link></>
                : <>Already have an account? <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="link">Sign in</Link></>}
            </p>
          </>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-ink-muted">You can also check out as a guest, no account needed.</p>
    </div>
  );
}
