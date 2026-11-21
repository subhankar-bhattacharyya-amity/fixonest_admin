import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeIndianRupee,
  CalendarDays,
  CalendarRange,
  FolderTree,
  HardHat,
  Layers,
  ShieldCheck,
  Star,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import { Area, Bar, CartesianGrid, ComposedChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/features/auth/index.js';
import { DUMMY_PROVIDERS, DUMMY_VERTICALS, useAdminBookings } from '@/features/adminBooking/index.js';
import { formatMoney, getBookingStart } from '@/features/providerBooking/index.js';
import { useDashboardOverview, fetchDashboardOverview } from '@/features/dashboard/index.js';
import { Avatar } from '@/components/common/avatar/index.js';
import { ROUTES, getBookingManagementDetailsPath, getBookingManagementPath } from '@/routes/constants.js';
import { BookingMiniList, DashboardCard, DashboardStatCard, RecentContacts, StatusBreakdown } from './components/index.js';
import { CHART_COLORS, SERIES_COLORS, axisTick, tooltipStyle } from './definitions/chartTheme.js';
import {
  buildWeeklyTrend,
  formatCompactMoney,
  isThisMonth,
  paidThisMonth,
  sum,
  weekOverWeek,
} from './definitions/dashboardMetrics.js';
import { PLATFORM_SNAPSHOT } from './definitions/superAdminDashboard.data.js';

const today = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

// The Super Admin's view of all of Fixonest: bookings and cash across every
// vertical, where bookings stand, what needs attention, top providers and the
// platform's size. Numbers are powered by the backend overview API.
export default function SuperAdminDashboardPage() {
  const dispatch = useDispatch();
  const { role } = useAuth();
  const { items } = useAdminBookings();
  const { data: overview } = useDashboardOverview();
  const [now] = useState(() => new Date());
  const [metric, setMetric] = useState('cash');

  useEffect(() => {
    dispatch(fetchDashboardOverview());
  }, [dispatch]);

  const listPath = getBookingManagementPath(role);
  const detailsFor = (booking) => getBookingManagementDetailsPath(role, booking.id);

  const data = useMemo(() => {
    if (overview) {
      const byVertical = (overview.byVertical || [])
        .map((row, index) => ({
          ...row,
          fill: SERIES_COLORS[index % SERIES_COLORS.length],
        }));

      return {
        monthCount: overview.stats?.monthCount ?? 0,
        cash: overview.stats?.cash ?? 0,
        commission: overview.stats?.commission ?? 0,
        paidCount: overview.stats?.paidCount ?? 0,
        trend: overview.trend || [],
        change: overview.stats?.change ?? 0,
        byVertical,
        providers: overview.topProviders || [],
        attention: overview.attention || [],
        rejected: overview.stats?.rejected ?? 0,
        awaitingCash: overview.stats?.awaitingCash ?? 0,
        snapshot: overview.platformSnapshot || PLATFORM_SNAPSHOT,
        statusBookings: overview.recentBookings || items,
        totalBookings: overview.statusBreakdown?.total ?? items.length,
      };
    }

    // Offline / initial fallback
    const paid = paidThisMonth(items, now);
    const monthBookings = items.filter((booking) => isThisMonth(getBookingStart(booking), now));
    const byVertical = DUMMY_VERTICALS.map((vertical) => {
      const list = items.filter((booking) => booking.vertical?.id === vertical.id);
      return {
        name: vertical.name,
        value: list.length,
        cash: sum(paidThisMonth(list, now), (booking) => booking.cashPayment.amountReceived),
      };
    })
      .filter((row) => row.value > 0)
      .map((row, index) => ({ ...row, fill: SERIES_COLORS[index % SERIES_COLORS.length] }));

    const providers = DUMMY_PROVIDERS.map((provider) => {
      const own = items.filter((booking) => booking.provider.id === provider.id);
      const done = own.filter((booking) => booking.status === 'paid' || booking.status === 'completed');
      return {
        ...provider,
        done: done.length,
        cash: sum(paidThisMonth(own, now), (booking) => booking.cashPayment.amountReceived),
      };
    })
      .sort((a, b) => b.cash - a.cash || b.rating - a.rating)
      .slice(0, 5);

    const attention = items
      .filter((booking) => booking.status === 'rejected' || booking.status === 'completed')
      .sort((a, b) => (a.status === 'rejected' ? -1 : 1) - (b.status === 'rejected' ? -1 : 1) || getBookingStart(a) - getBookingStart(b))
      .slice(0, 5);

    return {
      monthCount: monthBookings.length,
      cash: sum(paid, (booking) => booking.cashPayment.amountReceived),
      commission: sum(paid, (booking) => booking.pricing.commission),
      paidCount: paid.length,
      trend: buildWeeklyTrend(items, now, 6),
      change: weekOverWeek(items, now),
      byVertical,
      providers,
      attention,
      rejected: items.filter((booking) => booking.status === 'rejected').length,
      awaitingCash: items.filter((booking) => booking.status === 'completed').length,
      snapshot: PLATFORM_SNAPSHOT,
      statusBookings: items,
      totalBookings: items.length,
    };
  }, [overview, items, now]);

  const stats = [
    {
      label: 'Bookings This Month',
      value: data.monthCount,
      hint: data.change ? '' : `across ${data.byVertical.length || DUMMY_VERTICALS.length} verticals`,
      trend: data.change,
      icon: CalendarRange,
      tone: 'bg-teal-50 text-teal-600',
      to: listPath,
    },
    {
      label: 'Cash Collected',
      value: formatMoney(data.cash),
      hint: `from ${data.paidCount} paid booking${data.paidCount === 1 ? '' : 's'} this month`,
      icon: Wallet,
      tone: 'bg-emerald-50 text-emerald-600',
      to: `${listPath}?status=completed`,
    },
    {
      label: 'Platform Commission',
      value: formatMoney(data.commission),
      hint: "Fixonest's share this month",
      icon: BadgeIndianRupee,
      tone: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Needs Attention',
      value: data.rejected,
      hint: `${data.rejected} rejected booking${data.rejected === 1 ? '' : 's'}`,
      icon: HardHat,
      tone: 'bg-amber-50 text-amber-600',
      highlight: data.rejected > 0,
      to: `${listPath}?status=rejected`,
    },
  ];

  const snapshot = data.snapshot;

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Super Admin Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Fixonest at a glance - bookings, cash and providers across every vertical.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600">
            <CalendarDays size={16} className="text-teal-600" />
            {today.format(now)}
          </span>
          <Link
            to={listPath}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-teal-500/30 hover:bg-teal-600 transition-colors"
          >
            Booking Management
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, index) => (
          <DashboardStatCard key={stat.label} {...stat} index={index} />
        ))}
      </div>

      {/* Trend + Recent Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <DashboardCard
          className="lg:col-span-2"
          title="Bookings & Cash"
          subtitle="Last 6 weeks, all verticals"
          action={
            <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Chart metric">
              {[
                { key: 'cash', label: 'Cash' },
                { key: 'bookings', label: 'Bookings' },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setMetric(option.key)}
                  aria-pressed={metric === option.key}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    metric === option.key ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.trend} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashCashFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.teal} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.teal} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} dy={10} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={axisTick}
                  allowDecimals={false}
                  tickFormatter={metric === 'cash' ? formatCompactMoney : undefined}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => (metric === 'cash' ? [formatMoney(value), 'Cash collected'] : [value, 'Bookings'])}
                />
                {metric === 'cash' ? (
                  <Area type="monotone" dataKey="cash" stroke={CHART_COLORS.teal} strokeWidth={3} fill="url(#dashCashFill)" />
                ) : (
                  <Bar dataKey="bookings" fill={CHART_COLORS.teal} radius={[6, 6, 0, 0]} barSize={28} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <RecentContacts />
      </div>

      {/* Verticals / status / attention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <DashboardCard title="Bookings by Vertical" subtitle="Share of all bookings">
          <div className="relative h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.byVertical} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3} stroke="none" />
                <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [`${value} bookings`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-slate-800">{data.totalBookings}</span>
              <span className="text-xs text-slate-400">bookings</span>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {data.byVertical.map((row) => (
              <li key={row.name} className="flex items-center gap-3 text-sm">
                <span className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.fill }} />
                <span className="flex-1 truncate text-slate-600">{row.name}</span>
                <span className="font-semibold text-slate-800 tabular-nums">{row.value}</span>
                <span className="w-20 text-right text-xs font-medium text-emerald-600 tabular-nums">{formatMoney(row.cash)}</span>
              </li>
            ))}
          </ul>
        </DashboardCard>

        <DashboardCard title="Booking Status" subtitle="Where every booking stands" linkTo={listPath}>
          <StatusBreakdown bookings={data.statusBookings} counts={overview?.statusBreakdown} listPath={listPath} />
        </DashboardCard>

        <DashboardCard title="Needs Attention" subtitle="Rejected bookings" linkTo={`${listPath}?status=rejected`} bodyClassName="">
          <BookingMiniList
            bookings={data.attention}
            now={now}
            linkFor={detailsFor}
            subline={(booking) => (booking.status === 'rejected' ? `${booking.provider?.name} rejected` : `${booking.provider?.name} to collect cash`)}
            emptyTitle="All clear"
            emptyText="No rejected bookings or unpaid jobs."
          />
        </DashboardCard>
      </div>

      {/* Top providers + platform snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <DashboardCard className="lg:col-span-2" title="Top Providers" subtitle="By cash collected this month" bodyClassName="">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="w-12 px-4 sm:px-6 py-3">#</th>
                  <th scope="col" className="px-4 sm:px-6 py-3">Provider</th>
                  <th scope="col" className="hidden md:table-cell px-4 sm:px-6 py-3">Vertical</th>
                  <th scope="col" className="px-4 sm:px-6 py-3 text-right">Rating</th>
                  <th scope="col" className="hidden sm:table-cell px-4 sm:px-6 py-3 text-right">Jobs done</th>
                  <th scope="col" className="px-4 sm:px-6 py-3 text-right">Cash (month)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.providers.map((provider, index) => (
                  <tr key={provider.id} className="hover:bg-teal-50/30 transition-colors">
                    <td className="px-4 sm:px-6 py-3.5">
                      <span
                        className={`inline-flex w-7 h-7 items-center justify-center rounded-lg text-xs font-bold ${
                          index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={provider.name} className="h-9 w-9 text-xs" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">{provider.name}</p>
                          <p className="truncate text-xs text-slate-400">{provider.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 sm:px-6 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">
                        <Layers size={11} />
                        {provider.vertical?.name || provider.verticalName || 'Vertical'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <Star size={13} className="fill-amber-400 text-amber-400" />
                        {Number(provider.rating || 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-4 sm:px-6 py-3.5 text-right font-medium text-slate-600 tabular-nums">{provider.done}</td>
                    <td className="px-4 sm:px-6 py-3.5 text-right font-bold text-slate-800 tabular-nums">{formatMoney(provider.cash)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardCard>

        <DashboardCard title="Platform Snapshot" subtitle="Fixonest in numbers">
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: 'Customers',
                value: (snapshot.customers || 0).toLocaleString('en-IN'),
                hint: `+${snapshot.newCustomersThisMonth || 0} this month`,
                icon: Users,
                tone: 'bg-teal-50 text-teal-600',
              },
              {
                label: 'Providers',
                value: snapshot.providers || 0,
                hint: 'active',
                icon: HardHat,
                tone: 'bg-sky-50 text-sky-600',
              },
              {
                label: 'Verticals',
                value: snapshot.verticals || 0,
                hint: `${snapshot.admins || 0} admins`,
                icon: Layers,
                tone: 'bg-violet-50 text-violet-600',
              },
              {
                label: 'Services',
                value: snapshot.services || 0,
                hint: `${snapshot.categories || 0} categories`,
                icon: Wrench,
                tone: 'bg-amber-50 text-amber-600',
              },
              {
                label: 'Avg. rating',
                value: Number(snapshot.averageRating || 4.8).toFixed(1),
                hint: 'across services',
                icon: Star,
                tone: 'bg-orange-50 text-orange-500',
              },
              {
                label: 'Admins',
                value: snapshot.admins || 0,
                hint: 'running verticals',
                icon: ShieldCheck,
                tone: 'bg-emerald-50 text-emerald-600',
              },
            ].map((tile) => (
              <div key={tile.label} className="rounded-xl border border-slate-100 p-3.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tile.tone}`}>
                  <tile.icon size={17} />
                </div>
                <p className="mt-3 text-xl font-extrabold text-slate-800">{tile.value}</p>
                <p className="text-xs font-medium text-slate-500">{tile.label}</p>
                <p className="text-[11px] text-slate-400">{tile.hint}</p>
              </div>
            ))}
          </div>
          <Link
            to={ROUTES.SUPER_ADMIN_SERVICE_CATEGORIES}
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition-colors"
          >
            <FolderTree size={15} />
            Manage categories
          </Link>
        </DashboardCard>
      </div>
    </div>
  );
}
