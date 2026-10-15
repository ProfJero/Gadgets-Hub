import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Trash2, Star } from 'lucide-react';
import { fetchAllReviews, moderateReview, deleteReview, logActivity } from '../../lib/api';
import { useStore } from '../../context/StoreContext';
import { dateShort } from '../../lib/format';
import { PageHeader } from '../components/kit';
import { Stars, Tabs, Empty, PageLoader } from '../../components/ui';
import { toast } from '../../store';

export default function Reviews() {
  const { refresh } = useStore();
  const [items, setItems] = useState(null);
  const [tab, setTab] = useState('pending');
  const load = () => fetchAllReviews().then(setItems).catch((e) => { toast(e.message, 'error'); setItems([]); });
  useEffect(() => { load(); }, []);
  if (!items) return <PageLoader />;
  const list = items.filter((r) => r.status === tab);
  const count = (s) => items.filter((r) => r.status === s).length;

  const act = async (r, status) => {
    try {
      await moderateReview(r, status);
      await logActivity(`Review ${status}`, r.productName);
      setItems((xs) => xs.map((x) => (x.id === r.id ? { ...x, status } : x)));
      refresh();
    } catch (e) { toast(e.message, 'error'); }
  };
  const del = async (r) => {
    if (!confirm('Delete this review?')) return;
    await deleteReview(r);
    setItems((xs) => xs.filter((x) => x.id !== r.id));
    refresh();
  };

  return (
    <div>
      <PageHeader title="Reviews" sub="Approve genuine reviews to build trust. Approved reviews show on product pages." />
      <div className="card">
        <Tabs className="px-2" value={tab} onChange={setTab} tabs={[{ value: 'pending', label: 'Pending', count: count('pending') }, { value: 'approved', label: 'Approved', count: count('approved') }, { value: 'rejected', label: 'Rejected', count: count('rejected') }]} />
        {list.length === 0 ? <Empty icon={Star} title={`No ${tab} reviews`} /> : (
          <ul className="divide-y divide-slate-100">
            {list.map((r) => (
              <li key={r.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={r.rating} size="h-4 w-4" />
                  {r.title && <b>{r.title}</b>}
                  <span className="ml-auto text-xs text-ink-muted">{dateShort(r.createdAt)}</span>
                </div>
                <p className="mt-1.5 text-sm text-ink-soft">{r.comment}</p>
                <p className="mt-1 text-xs text-ink-muted">{r.name} on <Link to={`/admin/products/${r.productId}`} className="link">{r.productName}</Link></p>
                <div className="mt-3 flex gap-2">
                  {r.status !== 'approved' && <button onClick={() => act(r, 'approved')} className="btn-sm btn bg-emerald-600 text-white"><Check className="h-4 w-4" /> Approve</button>}
                  {r.status !== 'rejected' && <button onClick={() => act(r, 'rejected')} className="btn-outline btn-sm"><X className="h-4 w-4" /> Reject</button>}
                  <button onClick={() => del(r)} className="btn-ghost btn-sm text-rose-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
