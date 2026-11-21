import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeIndianRupee,
  CalendarRange,
  CheckCircle2,
  Download,
  FileBarChart,
  Handshake,
  Printer,
  Receipt,
  RotateCw,
  Wallet,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import httpClient from '@/lib/httpClient.js';
import { BOOKING_STATUS_META, PLATFORM_COMMISSION_RATE, formatBookingNumber, formatDateTime, formatMoney, useProviderBookings } from '@/features/providerBooking/index.js';
import { getProviderBookingDetailsPath } from '@/routes/constants.js';
import { DEFAULT_PERIOD, REPORT_PERIODS, buildProviderReport, downloadReportCsv } from './definitions/providerReports.js';
import { useProviderReport } from './hooks/useProviderReport.js';

const TEAL = '#14b8a6';
const GRID = '#f1f5f9';
const AXIS = { fill: '#94a3b8', fontSize: 12 };
const TOOLTIP = { borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(15 23 42 / 0.08)', fontSize: '12px' };
const STATUS_COLORS = {
  paid: '#10b981',
  completed: '#f97316',
  in_progress: '#8b5cf6',
  accepted: '#0ea5e9',
  pending: '#f59e0b',
  rejected: '#f43f5e',
  cancelled: '#94a3b8',
};
const TABLE_PREVIEW = 8;

const compactMoney = (value) => (value >= 100000 ? `₹${(value / 100000).toFixed(1)}L` : value >= 1000 ? `₹${Math.round(value / 1000)}k` : `₹${value}`);

// The provider's "Reports": earnings, cash collected, jobs and acceptance for
// a chosen period, compared with the period before, with charts, an earnings
// breakdown by service and every transaction - exportable as CSV. Powered by the
// backend provider report API with local fallback.
export default function ProviderReportsPage() {
  const { items } = useProviderBookings();
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [showAll, setShowAll] = useState(false);
  const [now] = useState(() => new Date());
  const [exporting, setExporting] = useState(false);

  const { report: apiReport, loading, error, refetch } = useProviderReport(period);
  const fallbackReport = useMemo(() => buildProviderReport(items, period, now), [items, period, now]);
  const report = apiReport || fallbackReport;

  const periodLabel = REPORT_PERIODS.find((item) => item.key === period)?.label ?? '';
  const allPaidBookings = report.paid || [];
  const hasData = allPaidBookings.length > 0;

  const handlePrint = () => {
    window.print();
  };

  const exportCsv = async () => {
    try {
      setExporting(true);
      const response = await httpClient.get(`/provider/api/v1/reports?period=${encodeURIComponent(period)}&format=csv`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fixonest-earnings-${periodLabel.toLowerCase().replace(/\s+/g, '-')}.csv`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        link.remove();
        window.URL.revokeObjectURL(url);
      }, 3000);
      toast.success('Report CSV downloaded', {
        description: `${allPaidBookings.length} transaction(s) exported.`,
      });
    } catch (err) {
      console.warn('Backend CSV stream failed, utilizing client-side exporter:', err);
      downloadReportCsv(report, periodLabel);
      toast.success('Report CSV downloaded', {
        description: `${allPaidBookings.length} transaction(s) exported.`,
      });
    } finally {
      setExporting(false);
    }
  };

  const stats = [
    {
      label: 'Net Earnings',
      value: formatMoney(report.earnings),
      hint: `after ${Math.round(PLATFORM_COMMISSION_RATE * 100)}% commission`,
      change: report.earningsChange,
      icon: Wallet,
      tone: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Cash Collected',
      value: formatMoney(report.gross),
      hint: `${formatMoney(report.commission)} owed to Fixonest`,
      change: report.grossChange,
      icon: BadgeIndianRupee,
      tone: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Jobs Completed',
      value: report.jobs,
      hint: `avg ${formatMoney(report.averageJob)} · ${report.hours} hr${report.hours === 1 ? '' : 's'} worked`,
      change: report.jobsChange,
      icon: CheckCircle2,
      tone: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Acceptance Rate',
      value: report.responses?.rate === null || report.responses?.rate === undefined ? '—' : `${report.responses.rate}%`,
      hint: `${report.responses?.accepted || 0} accepted · ${report.responses?.rejected || 0} rejected`,
      change: report.rateChange,
      changeUnit: ' pts',
      icon: Handshake,
      tone: 'bg-violet-50 text-violet-600',
    },
  ];

  const outcomeTotal = (report.outcomes || []).reduce((sum, row) => sum + row.value, 0);
  const outcomeData = (report.outcomes || []).map((row) => ({
    ...row,
    name: BOOKING_STATUS_META[row.status]?.label || row.status,
    fill: STATUS_COLORS[row.status] || '#94a3b8',
  }));
  const topServiceEarnings = (report.services && report.services[0]?.earnings) || 1;
  const busiest = (report.weekdays || []).reduce((best, day) => (day.jobs > (best?.jobs || 0) ? day : best), report.weekdays?.[0] || { label: 'Mon', jobs: 0 });

  if (loading && !apiReport && (!items || items.length === 0)) {
    return <ReportSkeleton />;
  }

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Official Print-Only Header */}
      <div className="hidden print:block mb-6 pb-4 border-b-2 border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">FIXONEST</h1>
            <p className="text-xs uppercase tracking-wider font-semibold text-teal-600 mt-0.5">
              Official Service Partner Statement
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 rounded bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider border border-slate-300">
              Provider Report
            </span>
            <p className="text-xs text-slate-500 mt-1">Generated: {new Date().toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-500 font-medium">Reporting Period: </span>
            <span className="font-semibold text-slate-800">{report.range?.label || periodLabel}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 font-medium">Platform: </span>
            <span className="font-semibold text-slate-800">Fixonest Service Network</span>
          </div>
        </div>
      </div>

      {/* Screen Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Your earnings, jobs and performance - download them any time.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 overflow-x-auto no-scrollbar" role="group" aria-label="Report period">
            {REPORT_PERIODS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setPeriod(option.key);
                  setShowAll(false);
                }}
                aria-pressed={period === option.key}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  period === option.key ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={refetch}
              disabled={loading}
              aria-label="Refresh report"
              title="Refresh live data"
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-colors disabled:opacity-50"
            >
              <RotateCw size={16} className={loading ? 'animate-spin text-teal-600' : ''} />
            </button>
            <button
              type="button"
              onClick={handlePrint}
              aria-label="Print report"
              title="Print"
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-colors"
            >
              <Printer size={16} />
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={exporting}
              className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-teal-500/30 hover:bg-teal-600 transition-colors disabled:opacity-60"
            >
              <Download size={15} className={exporting ? 'animate-bounce' : ''} />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>
      </div>

      <p className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-100 px-3.5 py-2 text-sm text-slate-600 shadow-sm print:hidden">
        <CalendarRange size={15} className="text-teal-600" />
        {report.range.label}
        <span className="text-slate-300">·</span>
        <span className="text-slate-400">compared with the {periodLabel.toLowerCase().startsWith('this') || periodLabel.toLowerCase().startsWith('last m') ? 'month' : 'period'} before</span>
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 print:grid-cols-4 print:gap-3">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow animate-rise-in print:shadow-none print:border-slate-200 print:p-4 print-avoid-break"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800 truncate">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${stat.tone}`}>
                <stat.icon size={24} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 min-w-0">
              {stat.change !== null && stat.change !== undefined && <ChangePill value={stat.change} unit={stat.changeUnit ?? '%'} />}
              <span className="text-xs text-slate-400 truncate">{stat.hint}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Trend + outcomes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card
          className="lg:col-span-2"
          title="Earnings Trend"
          subtitle={`Net earnings per ${report.trend.grouping}, after commission`}
        >
          {hasData ? (
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report.trend.points} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reportEarningsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={TEAL} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS} dy={10} minTickGap={24} />
                  <YAxis axisLine={false} tickLine={false} tick={AXIS} tickFormatter={compactMoney} />
                  <Tooltip
                    contentStyle={TOOLTIP}
                    formatter={(value, _name, item) => [
                      `${formatMoney(value)} · ${item.payload.jobs} job${item.payload.jobs === 1 ? '' : 's'}`,
                      'Earned',
                    ]}
                  />
                  <Area type="monotone" dataKey="earnings" stroke={TEAL} strokeWidth={3} fill="url(#reportEarningsFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <NoData text="No cash was recorded in this period." />
          )}
        </Card>

        <Card title="Booking Outcomes" subtitle="Visits scheduled in this period">
          {outcomeTotal ? (
            <>
              <div className="relative h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={outcomeData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3} stroke="none" />
                    <Tooltip contentStyle={TOOLTIP} formatter={(value, name) => [`${value} booking${value === 1 ? '' : 's'}`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-slate-800">{outcomeTotal}</span>
                  <span className="text-xs text-slate-400">visits</span>
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {outcomeData.map((row) => (
                  <li key={row.status} className="flex items-center gap-3 text-sm">
                    <span className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.fill }} />
                    <span className="flex-1 text-slate-600">{row.name}</span>
                    <span className="font-semibold text-slate-800 tabular-nums">{row.value}</span>
                    <span className="w-10 text-right text-xs text-slate-400 tabular-nums">{Math.round((row.value / outcomeTotal) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <NoData text="No visits in this period." />
          )}
        </Card>
      </div>

      {/* Services + busiest days */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2" title="Earnings by Service" subtitle="Which jobs pay you the most">
          {report.services.length ? (
            <ul className="space-y-4">
              {report.services.map((service) => (
                <li key={service.name}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{service.name}</p>
                      <p className="text-xs text-slate-400">
                        {service.category} · {service.jobs} job{service.jobs === 1 ? '' : 's'} · {formatMoney(service.cash)} cash
                      </p>
                    </div>
                    <p className="shrink-0 font-bold text-slate-800 tabular-nums">{formatMoney(service.earnings)}</p>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-teal-500 transition-all duration-700" style={{ width: `${(service.earnings / topServiceEarnings) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <NoData text="Completed, paid jobs will be broken down here." />
          )}
        </Card>

        <Card title="Busiest Days" subtitle={busiest?.jobs ? `${busiest.label} is your busiest day` : 'Jobs by day of the week'}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.weekdays} margin={{ top: 10, right: 0, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={AXIS} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP} cursor={{ fill: '#f8fafc' }} formatter={(value) => [`${value} job${value === 1 ? '' : 's'}`, 'Visits']} />
                <Bar
                  dataKey="jobs"
                  radius={[6, 6, 0, 0]}
                  barSize={22}
                  // The busiest day stands out in full teal.
                  shape={(props) => (
                    <rect
                      x={props.x}
                      y={props.y}
                      width={props.width}
                      height={props.height}
                      rx={6}
                      fill={props.payload.label === busiest?.label && busiest.jobs ? TEAL : '#99f6e4'}
                    />
                  )}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Transactions */}
      <Card
        title="Transactions"
        subtitle={`${allPaidBookings.length} cash payment${allPaidBookings.length === 1 ? '' : 's'} recorded, newest first`}
        bodyClassName=""
        action={
          hasData && (
            <button
              type="button"
              onClick={exportCsv}
              disabled={exporting}
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 disabled:opacity-50"
            >
              <Download size={14} className={exporting ? 'animate-bounce' : ''} />
              CSV
            </button>
          )
        }
      >
        {hasData ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th scope="col" className="px-4 sm:px-6 py-3">Booking</th>
                    <th scope="col" className="hidden md:table-cell print:table-cell px-4 sm:px-6 py-3">Customer</th>
                    <th scope="col" className="hidden sm:table-cell print:table-cell px-4 sm:px-6 py-3">Completed</th>
                    <th scope="col" className="px-4 sm:px-6 py-3 text-right">Cash</th>
                    <th scope="col" className="hidden lg:table-cell print:table-cell px-4 sm:px-6 py-3 text-right">Commission</th>
                    <th scope="col" className="px-4 sm:px-6 py-3 text-right">You earn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allPaidBookings.map((booking, index) => {
                    const isHiddenOnScreen = !showAll && index >= TABLE_PREVIEW;
                    const bookingNum = booking.bookingNumber || formatBookingNumber(booking) || booking.id;
                    const serviceName = booking.serviceTitle || booking.service?.name || 'Service';
                    const categoryName = booking.categoryTitle || booking.service?.category;
                    const customerName = booking.customerName || booking.customer?.name || 'Customer';
                    const dateVal = booking.completedAt || booking.cashPayment?.receivedAt;
                    const grossVal = booking.gross ?? booking.cashPayment?.amountReceived ?? 0;
                    const commVal = booking.commission ?? booking.pricing?.commission ?? booking.pricing?.platformFee ?? 0;
                    const earnVal = booking.earnings ?? booking.pricing?.earning ?? booking.pricing?.providerEarnings ?? 0;

                    return (
                      <tr
                        key={booking.id || index}
                        className={`hover:bg-teal-50/30 transition-colors ${
                          isHiddenOnScreen ? 'hidden print:table-row' : ''
                        }`}
                      >
                        <td className="px-4 sm:px-6 py-3.5">
                          <Link to={getProviderBookingDetailsPath(bookingNum)} className="group block min-w-0 print:no-underline">
                            <span className="block truncate font-semibold text-slate-800 group-hover:text-teal-600 transition-colors">
                              {serviceName}
                            </span>
                            <span className="block font-mono text-xs text-slate-400 print:text-slate-600">
                              {bookingNum} {categoryName ? `· ${categoryName}` : ''}
                            </span>
                          </Link>
                        </td>
                        <td className="hidden md:table-cell print:table-cell px-4 sm:px-6 py-3.5 text-slate-600">{customerName}</td>
                        <td className="hidden sm:table-cell print:table-cell px-4 sm:px-6 py-3.5 whitespace-nowrap text-slate-500">
                          {dateVal ? formatDateTime(dateVal) : '—'}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right font-medium text-slate-700 tabular-nums">
                          {formatMoney(grossVal)}
                        </td>
                        <td className="hidden lg:table-cell print:table-cell px-4 sm:px-6 py-3.5 text-right text-slate-400 tabular-nums">
                          − {formatMoney(commVal)}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right font-bold text-emerald-600 tabular-nums">
                          {formatMoney(earnVal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-100 bg-slate-50/60 font-bold text-slate-800">
                    <td className="px-4 sm:px-6 py-3.5">Total · {allPaidBookings.length} job{allPaidBookings.length === 1 ? '' : 's'}</td>
                    <td className="hidden md:table-cell print:table-cell" />
                    <td className="hidden sm:table-cell print:table-cell" />
                    <td className="px-4 sm:px-6 py-3.5 text-right tabular-nums">{formatMoney(report.gross)}</td>
                    <td className="hidden lg:table-cell print:table-cell px-4 sm:px-6 py-3.5 text-right text-slate-400 tabular-nums">− {formatMoney(report.commission)}</td>
                    <td className="px-4 sm:px-6 py-3.5 text-right text-emerald-600 tabular-nums">{formatMoney(report.earnings)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {allPaidBookings.length > TABLE_PREVIEW && (
              <div className="flex justify-center border-t border-slate-100 px-4 py-3 print:hidden">
                <button
                  type="button"
                  onClick={() => setShowAll((value) => !value)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
                >
                  {showAll ? 'Show less' : `Show all ${allPaidBookings.length} transactions`}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center text-center px-6 py-14">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-3xl bg-teal-400/20 blur-xl" />
              <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30">
                <Receipt size={28} />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-800">No transactions in this period</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">Cash you record after a job shows up here. Try a longer period.</p>
          </div>
        )}
      </Card>

      {/* Official Print-Only Footer */}
      <div className="hidden print:flex items-center justify-between text-[11px] text-slate-500 pt-4 mt-6 border-t border-slate-300">
        <span>FIXONEST SERVICE NETWORK • CONFIDENTIAL PARTNER STATEMENT</span>
        <span>All amounts in Indian Rupees (₹)</span>
      </div>
    </div>
  );
}

function ChangePill({ value, unit }) {
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold ${
        positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
      }`}
      title="Compared with the previous period"
    >
      {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {positive ? '+' : ''}
      {value}
      {unit}
    </span>
  );
}

function Card({ title, subtitle, action, className = '', bodyClassName = 'p-4 sm:p-6', children }) {
  return (
    <section className={`min-w-0 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col animate-rise-in ${className}`}>
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 border-b border-slate-100">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-800 truncate">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className={`flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

function NoData({ text }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center text-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
        <FileBarChart size={22} />
      </div>
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-slate-200 rounded-lg" />
          <div className="h-4 w-72 bg-slate-100 rounded-md" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-64 bg-slate-100 rounded-xl" />
          <div className="h-10 w-28 bg-slate-200 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 bg-slate-100 rounded" />
              <div className="w-10 h-10 rounded-xl bg-slate-100" />
            </div>
            <div className="h-8 w-28 bg-slate-200 rounded-lg" />
            <div className="h-4 w-36 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 space-y-4">
          <div className="h-5 w-40 bg-slate-200 rounded" />
          <div className="h-64 bg-slate-50 rounded-xl" />
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-4">
          <div className="h-5 w-32 bg-slate-200 rounded" />
          <div className="h-64 bg-slate-50 rounded-xl" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-4">
        <div className="h-5 w-48 bg-slate-200 rounded" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-50 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
