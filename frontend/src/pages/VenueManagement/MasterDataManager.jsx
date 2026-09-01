/* eslint-disable react/prop-types, react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';

const MasterDataManager = ({ title, loadItems, createItem, updateItem, deleteItem, getId, getName, isActive }) => {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const result = await loadItems();
      setItems(result.data || []);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    try {
      setError('');
      await createItem(name);
      setName('');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const edit = async (item) => {
    const nextName = window.prompt(`Edit ${title.slice(0, -1)}`, getName(item));
    if (nextName === null) return;
    try {
      setError('');
      await updateItem(getId(item), nextName, isActive(item));
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const toggleActive = async (item) => {
    try {
      setError('');
      await updateItem(getId(item), getName(item), !isActive(item));
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete ${getName(item)}?`)) return;
    try {
      setError('');
      await deleteItem(getId(item));
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return <section className="ui-card mt-6 p-4 sm:p-5">
    <h2 className="text-xl font-semibold text-slate-800">Manage {title}</h2>
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder={`New ${title.slice(0, -1)}`} className="ui-input flex-1" />
      <button type="button" onClick={add} className="flex items-center justify-center gap-1 rounded-xl bg-blue-700 px-4 py-2.5 text-white transition hover:bg-blue-800"><Plus size={16} /> Add</button>
    </div>
    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    <div className="mt-4 space-y-2">
      {items.map((item) => <div key={getId(item)} className="flex flex-col gap-3 rounded-xl border border-slate-200 px-3 py-3 transition hover:border-blue-200 hover:bg-blue-50/40 sm:flex-row sm:items-center sm:justify-between">
        <span className={title === 'Venue Facilities' ? 'ui-chip w-fit' : 'font-medium text-slate-700'}>{getName(item)}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => toggleActive(item)} className={`rounded px-2 py-1 text-xs ${isActive(item) ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{isActive(item) ? 'Active' : 'Inactive'}</button>
          <button type="button" onClick={() => edit(item)} className="ui-icon-button text-blue-600 hover:bg-blue-100" aria-label={`Edit ${getName(item)}`}><Pencil size={16} /></button>
          <button type="button" onClick={() => remove(item)} className="ui-icon-button text-red-600 hover:bg-red-100" aria-label={`Delete ${getName(item)}`}><Trash2 size={16} /></button>
        </div>
      </div>)}
    </div>
  </section>;
};

export default MasterDataManager;
