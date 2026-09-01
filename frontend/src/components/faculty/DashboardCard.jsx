const DashboardCard = ({ title, count, icon: Icon, accent }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className={`inline-flex rounded-xl p-3 ${accent}`}>
        <Icon size={22} />
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-1 text-3xl font-semibold text-slate-800">{count}</p>
      </div>
    </div>
  );
};

export default DashboardCard;
