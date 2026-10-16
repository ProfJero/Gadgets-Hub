import { useEffect, useMemo, useState } from 'react';
import { UserPlus, Crown, Shield, Mail, Pencil, UserMinus, Ban, CheckCircle2 } from 'lucide-react';
import { fetchUsers, updateUser, logActivity } from '../../lib/api';
import { createStaffAccount, sendStaffInvite } from '../../lib/staff';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS, ROLES, STAFF_ROLES } from '../../lib/constants';
import { timeAgo } from '../../lib/format';
import { PageHeader } from '../components/kit';
import { Modal, Field, Badge, PageLoader, Spinner, Tabs, cx } from '../../components/ui';
import { toast } from '../../store';

function PermissionPicker({ role, perms, onRole, onPerms }) {
  return (
    <div className="space-y-4">
      <div>
        <span className="label">Role</span>
        <div className="grid grid-cols-3 gap-2">
          {STAFF_ROLES.map((r) => (
            <button type="button" key={r} onClick={() => { onRole(r); onPerms(ROLES[r].perms); }}
              className={cx('rounded-xl p-3 text-left text-sm ring-2', role === r ? 'bg-navy-50 ring-navy-600' : 'ring-slate-200')}>
              <b className="block">{ROLES[r].label}</b>
              <span className="text-xs text-ink-muted">{ROLES[r].perms.length} permission{ROLES[r].perms.length === 1 ? '' : 's'}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="label">Permissions</span>
        <div className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
          {PERMISSIONS.map((p) => (
            <label key={p.key} className="flex cursor-pointer items-start gap-3 p-3">
              <input type="checkbox" checked={perms.includes(p.key)} onChange={() => onPerms(perms.includes(p.key) ? perms.filter((x) => x !== p.key) : [...perms, p.key])} className="mt-0.5 rounded border-slate-300 text-navy-600" />
              <span><span className="block text-sm font-semibold">{p.label}</span><span className="text-xs text-ink-muted">{p.desc}</span></span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Staff() {
  const { user, isOwner } = useAuth();
  const [users, setUsers] = useState(null);
  const [add, setAdd] = useState(null);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => fetchUsers().then(setUsers).catch((e) => { toast(e.message, 'error'); setUsers([]); });
  useEffect(() => { load(); }, []);

  const staff = useMemo(() => (users || []).filter((u) => u.role && u.role !== 'customer').sort((a, b) => (a.role === 'superadmin' ? -1 : b.role === 'superadmin' ? 1 : 0)), [users]);

  if (!users) return <PageLoader />;

  const submitAdd = async (e) => {
    e.preventDefault();
    if (!add.permissions.length) return toast('Choose at least one permission', 'error');
    setBusy(true);
    try {
      const email = add.email.trim().toLowerCase();
      if (add.mode === 'existing') {
        const u = users.find((x) => x.email?.toLowerCase() === email);
        if (!u) throw new Error('No account found with that email. Ask them to register on the store first, or create a new account.');
        if (u.role === 'superadmin') throw new Error('That user is the owner.');
        await updateUser(u.id, { role: add.role, permissions: add.permissions, disabled: false });
      } else {
        if (add.password.length < 6) throw new Error('Temporary password must be at least 6 characters');
        await createStaffAccount({ name: add.name.trim(), email, password: add.password, role: add.role, permissions: add.permissions, phone: add.phone });
        if (add.invite) await sendStaffInvite(email).catch(() => {});
      }
      await logActivity(`Added staff (${ROLES[add.role].label})`, email);
      toast(`${email} can now sign in to the admin`);
      setAdd(null);
      load();
    } catch (err) {
      toast(err.code === 'auth/email-already-in-use' ? 'This email already has an account. Use “Promote existing account”.' : err.message, 'error');
    } finally { setBusy(false); }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateUser(edit.id, { role: edit.role, permissions: edit.permissions });
      await logActivity('Changed staff permissions', `${edit.email} → ${ROLES[edit.role].label}`);
      toast('Permissions updated');
      setEdit(null);
      load();
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };

  const toggleDisabled = async (u) => {
    try {
      await updateUser(u.id, { disabled: !u.disabled });
      await logActivity(`${u.disabled ? 'Re-enabled' : 'Suspended'} staff`, u.email);
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const removeStaff = async (u) => {
    if (!confirm(`Remove admin access for ${u.email}? Their customer account stays.`)) return;
    try {
      await updateUser(u.id, { role: 'customer', permissions: [] });
      await logActivity('Removed staff access', u.email);
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div>
      <PageHeader title="Staff & roles" sub="Give your team access to only what they need."
        actions={<button onClick={() => setAdd({ mode: 'new', name: '', email: '', phone: '', password: '', role: 'staff', permissions: ROLES.staff.perms, invite: true })} className="btn-primary"><UserPlus className="h-4 w-4" /> Add staff</button>} />

      <div className="card">
        <ul className="divide-y divide-slate-100">
          {staff.map((u) => {
            const owner = u.role === 'superadmin';
            const me = u.id === user.uid;
            const perms = owner ? ROLES.superadmin.perms : u.permissions || [];
            return (
              <li key={u.id} className={cx('flex flex-wrap items-center gap-3 p-4', u.disabled && 'opacity-60')}>
                <span className={cx('flex h-11 w-11 items-center justify-center rounded-full font-bold text-white', owner ? 'bg-brand-500' : 'bg-navy-600')}>{owner ? <Crown className="h-5 w-5" /> : (u.name || u.email || '?')[0].toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 font-semibold">{u.name || u.email} {me && <Badge>You</Badge>} {u.disabled && <Badge tone="bg-rose-50 text-rose-700 ring-rose-200">Suspended</Badge>}</div>
                  <div className="text-xs text-ink-muted">{u.email} · added {timeAgo(u.createdAt)}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Badge tone={owner ? 'bg-brand-50 text-brand-800 ring-brand-200' : 'bg-navy-50 text-navy-800 ring-navy-200'}><Shield className="h-3 w-3" /> {ROLES[u.role]?.label || u.role}</Badge>
                    {!owner && perms.map((p) => <Badge key={p}>{PERMISSIONS.find((x) => x.key === p)?.label || p}</Badge>)}
                    {owner && <Badge>Full access</Badge>}
                  </div>
                </div>
                {!owner && !me && (
                  <div className="flex gap-1">
                    <button onClick={() => setEdit({ ...u, permissions: u.permissions || [] })} className="btn-ghost btn-sm" title="Edit permissions"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => sendStaffInvite(u.email).then(() => toast('Password reset email sent'))} className="btn-ghost btn-sm" title="Send password reset"><Mail className="h-4 w-4" /></button>
                    <button onClick={() => toggleDisabled(u)} className="btn-ghost btn-sm" title={u.disabled ? 'Re-enable' : 'Suspend'}>{u.disabled ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Ban className="h-4 w-4 text-amber-600" />}</button>
                    <button onClick={() => removeStaff(u)} className="btn-ghost btn-sm text-rose-600" title="Remove access"><UserMinus className="h-4 w-4" /></button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {!isOwner && <p className="mt-3 text-xs text-ink-muted">Only the owner can change the owner account.</p>}

      <Modal open={!!add} onClose={() => setAdd(null)} title="Add a team member" size="lg"
        footer={<button form="add-staff" disabled={busy} className="btn-primary">{busy ? <Spinner /> : 'Add staff member'}</button>}>
        {add && (
          <form id="add-staff" onSubmit={submitAdd} className="space-y-5">
            <Tabs value={add.mode} onChange={(mode) => setAdd({ ...add, mode })} tabs={[{ value: 'new', label: 'Create new account' }, { value: 'existing', label: 'Promote existing account' }]} />
            <div className="grid gap-4 sm:grid-cols-2">
              {add.mode === 'new' && <Field label="Full name"><input className="input" required value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} /></Field>}
              <Field label="Email" className={add.mode === 'existing' ? 'sm:col-span-2' : ''} hint={add.mode === 'existing' ? 'They must already have registered on the store' : ''}>
                <input className="input" type="email" required value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} />
              </Field>
              {add.mode === 'new' && (
                <>
                  <Field label="Temporary password" hint="At least 6 characters. Share it privately."><input className="input" required minLength={6} value={add.password} onChange={(e) => setAdd({ ...add, password: e.target.value })} /></Field>
                  <Field label="Phone (optional)"><input className="input" type="tel" value={add.phone} onChange={(e) => setAdd({ ...add, phone: e.target.value })} /></Field>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={add.invite} onChange={(e) => setAdd({ ...add, invite: e.target.checked })} className="rounded border-slate-300 text-navy-600" /> Also email them a link to set their own password</label>
                </>
              )}
            </div>
            <PermissionPicker role={add.role} perms={add.permissions} onRole={(role) => setAdd((a) => ({ ...a, role }))} onPerms={(permissions) => setAdd((a) => ({ ...a, permissions }))} />
            {!isOwner && add.permissions.includes('staff') && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Heads up: “Staff management” lets this person add and remove other admins.</p>}
          </form>
        )}
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Permissions · ${edit?.name || edit?.email || ''}`} size="lg"
        footer={<button form="edit-staff" disabled={busy} className="btn-primary">{busy ? <Spinner /> : 'Save'}</button>}>
        {edit && (
          <form id="edit-staff" onSubmit={submitEdit}>
            <PermissionPicker role={edit.role} perms={edit.permissions} onRole={(role) => setEdit((x) => ({ ...x, role }))} onPerms={(permissions) => setEdit((x) => ({ ...x, permissions }))} />
          </form>
        )}
      </Modal>
    </div>
  );
}
