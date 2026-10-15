import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { fetchActivity } from '../../lib/api';
import { dateTime } from '../../lib/format';
import { PageHeader, SearchInput } from '../components/kit';
import { Empty, PageLoader } from '../../components/ui';

export default function Activity() {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  useEffect(() => { fetchActivity(300).then(setItems).catch(() => setItems([])); }, []);
  if (!items) return <PageLoader />;
  const list = items.filter((a) => `${a.action} ${a.detail} ${a.email}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader title="Activity log" sub="Who did what, and when. Useful when several people manage the store." />
      <div className="card">
        <div className="p-3"><SearchInput value={q} onChange={setQ} placeholder="Filter by staff email or action…" /></div>
        {list.length === 0 ? <Empty icon={History} title="No activity yet" /> : (
          <ul className="divide-y divide-slate-100">
            {list.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 px-4 py-2.5 text-sm">
                <span className="font-semibold">{a.action}</span>
                {a.detail && <span className="text-ink-soft">{a.detail}</span>}
                <span className="ml-auto text-xs text-ink-muted">{a.email} · {dateTime(a.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
