const DetailModal = ({ title, subtitle, rows, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-slate-800">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="mt-6 space-y-3 text-sm text-slate-600">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-1 border-b border-slate-100 pb-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-medium text-slate-700">{row.label}</span>
              <span className="text-left sm:text-right">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DetailModal;
