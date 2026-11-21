import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// A dashboard section: white card with the panel's standard header bar
// (title, optional subtitle and "View all"-style link) and a body.
export default function DashboardCard({ title, subtitle, linkTo, linkLabel = 'View all', action, className = '', bodyClassName = 'p-4 sm:p-6', children }) {
  return (
    <section className={`min-w-0 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col animate-rise-in ${className}`}>
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 border-b border-slate-100">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-800 truncate">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
        {action}
        {linkTo && (
          <Link to={linkTo} className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700">
            {linkLabel}
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
      <div className={`flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
