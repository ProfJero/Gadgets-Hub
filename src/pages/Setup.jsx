import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ownerExists, claimOwnership } from '../lib/api';
import { Spinner, PageLoader } from '../components/ui';
import { toast } from '../store';

/** One-time setup: the first signed-in user to visit becomes the store owner. */
export default function Setup() {
  const { user, profile, loading } = useAuth();
  const [exists, setExists] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { ownerExists().then(setExists).catch(() => setExists(true)); }, []);

  if (exists === null || (user && loading)) return <PageLoader />;

  const claim = async () => {
    setBusy(true);
    try {
      await claimOwnership(user, profile?.name);
      toast('You are now the store owner 👑');
      navigate('/admin');
    } catch (e) {
      toast(e.message, 'error');
      setExists(true);
    } finally { setBusy(false); }
  };

  return (
    <div className="container-x max-w-lg py-12">
      <div className="card p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Crown className="h-8 w-8" /></div>
        <h1 className="mt-4 font-display text-3xl font-bold">Store setup</h1>
        {exists ? (
          <>
            <p className="mt-2 text-ink-muted">This store already has an owner. Ask them to add you as staff from <b>Admin → Staff</b>.</p>
            <Link to="/" className="btn-outline mt-6">Back to shop</Link>
          </>
        ) : !user ? (
          <>
            <p className="mt-2 text-ink-muted">Create an account (or sign in) with the email the owner will use. Then come back to this page to claim the store.</p>
            <div className="mt-6 flex justify-center gap-2">
              <Link to="/register?next=/setup" className="btn-primary">Create account</Link>
              <Link to="/login?next=/setup" className="btn-outline">Sign in</Link>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-ink-muted">Signed in as <b>{user.email}</b>. Claim this store to get full owner access. This can only be done once.</p>
            <ul className="mx-auto mt-4 max-w-xs space-y-1 text-left text-sm">
              {['Manage products & stock', 'Process orders', 'Add staff & set permissions', 'Configure payments & delivery'].map((t) => (
                <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{t}</li>
              ))}
            </ul>
            <button onClick={claim} disabled={busy} className="btn-primary btn-lg mt-6">{busy ? <Spinner /> : <Crown className="h-5 w-5" />} Claim store ownership</button>
          </>
        )}
      </div>
    </div>
  );
}
