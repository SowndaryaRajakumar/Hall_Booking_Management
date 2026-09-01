const Pagination = ({ page = 1, totalPages = 0, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = Array.from(new Set([1, page - 1, page, page + 1, totalPages].filter((value) => value >= 1 && value <= totalPages))).sort((a, b) => a - b);
  const items = [];
  pages.forEach((value, index) => { if (index && value - pages[index - 1] > 1) items.push(<span key={`gap-${value}`} className="px-2 text-slate-400">...</span>); items.push(<button key={value} type="button" onClick={() => onPageChange(value)} disabled={value === page} className={`min-w-9 rounded-lg px-3 py-2 text-sm ${value === page ? "bg-blue-700 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{value}</button>); });
  return <nav className="mt-5 flex items-center justify-center gap-2" aria-label="Pagination"><button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">Previous</button>{items}<button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">Next</button></nav>;
};
export default Pagination;
