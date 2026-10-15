import { useState } from 'react';
import { Plus, FolderTree, Pencil, Trash2, EyeOff } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { saveCategory, deleteCategory, logActivity } from '../../lib/api';
import { slugify } from '../../lib/format';
import { PageHeader, ImageUploader } from '../components/kit';
import CategoryIcon from '../../components/CategoryIcon';
import { Modal, Field, Toggle, Empty, Img } from '../../components/ui';
import { toast } from '../../store';

export default function Categories() {
  const { categories, products, refresh } = useStore();
  const [edit, setEdit] = useState(null);

  const count = (slug) => products.filter((p) => p.category === slug).length;

  const submit = async (e) => {
    e.preventDefault();
    try {
      await saveCategory({ ...edit, slug: edit.id ? edit.slug : slugify(edit.slug || edit.name) });
      await logActivity(`${edit.id ? 'Updated' : 'Created'} category`, edit.name);
      refresh();
      toast('Category saved');
      setEdit(null);
    } catch (err) { toast(err.message, 'error'); }
  };

  const remove = async (c) => {
    if (count(c.slug) > 0) return toast(`Move or delete the ${count(c.slug)} live products in this category first`, 'error');
    if (!confirm(`Delete category “${c.name}”?`)) return;
    await deleteCategory(c.id);
    await logActivity('Deleted category', c.name);
    refresh();
  };

  return (
    <div>
      <PageHeader title="Categories" sub="Organise your catalogue. The order here is the order on the storefront."
        actions={<button onClick={() => setEdit({ name: '', slug: '', description: '', image: '', order: categories.length + 1, hidden: false })} className="btn-primary"><Plus className="h-4 w-4" /> Add category</button>} />
      <div className="card">
        {categories.length === 0 ? <Empty icon={FolderTree} title="No categories yet" text="Create “Laptops” first (slug: laptops). The laptop filters use it." /> : (
          <ul className="divide-y divide-slate-100">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-4 p-4">
                <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-navy-50 text-navy-700">
                  {c.image ? <Img src={c.image} w={100} h={100} className="h-full w-full" /> : <CategoryIcon slug={c.slug} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-semibold">{c.name} {c.hidden && <EyeOff className="h-4 w-4 text-ink-muted" />}</div>
                  <div className="text-xs text-ink-muted">/{c.slug} · {count(c.slug)} live products · position {c.order}</div>
                </div>
                <button onClick={() => setEdit({ ...c })} className="btn-ghost btn-sm"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(c)} className="btn-ghost btn-sm text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit category' : 'New category'} footer={<button form="cat" className="btn-primary">Save</button>}>
        {edit && (
          <form id="cat" onSubmit={submit} className="space-y-4">
            <Field label="Name"><input className="input" required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="URL slug" hint={edit.id ? 'Slug cannot change after creation' : `Will be /category/${slugify(edit.slug || edit.name) || '…'}`}>
              <input className="input" disabled={!!edit.id} value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} placeholder={slugify(edit.name)} />
            </Field>
            <Field label="Short description"><textarea className="input" value={edit.description || ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <Field label="Position"><input className="input" type="number" value={edit.order} onChange={(e) => setEdit({ ...edit, order: e.target.value })} /></Field>
            <div><span className="label">Image (optional)</span><ImageUploader single folder="gadgets-hub/categories" images={edit.image ? [{ url: edit.image }] : []} onChange={(v) => setEdit({ ...edit, image: v[0]?.url || '' })} /></div>
            <Toggle checked={!!edit.hidden} onChange={(v) => setEdit({ ...edit, hidden: v })} label="Hide from menus" />
          </form>
        )}
      </Modal>
    </div>
  );
}
