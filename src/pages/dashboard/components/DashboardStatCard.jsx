import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

// KPI card used on every dashboard - same markup as the listing pages' stat
// cards (label, big value, icon tile, hint), plus an optional trend pill.
// With `to` the whole card is a link.
export default function DashboardStatCard({ label, value, icon: Icon, tone, hint, trend, to, highlight = false, index = 0 }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-800 truncate">{value}</p>
        </div>
        <div className={`relative w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${tone}`}>
          <Icon size={24} />
          {highlight && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500 ring-2 ring-white" />
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 min-w-0">
        {trend && (
          <span
            className={`inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold ${
              trend.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}
          >
            {trend.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend.value}
          </span>
        )}
        <span className="text-xs text-slate-400 truncate">{hint}</span>
      </div>
    </>
  );

  const className = `block bg-white rounded-2xl p-5 sm:p-6 shadow-sm border hover:shadow-md transition-all animate-rise-in ${
    highlight ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-100'
  } ${to ? 'hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60' : ''}`;
  const style = { animationDelay: `${index * 60}ms` };

  return to ? (
    <Link to={to} className={className} style={style}>
      {body}
    </Link>
  ) : (
    <div className={className} style={style}>
      {body}
    </div>
  );
}
