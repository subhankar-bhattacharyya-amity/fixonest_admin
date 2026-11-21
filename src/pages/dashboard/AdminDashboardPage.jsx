import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, CalendarDays, Hourglass, Star, UserX, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/features/auth/index.js';
import { DUMMY_PROVIDERS, useAdminBookings } from '@/features/adminBooking/index.js';
import { formatMoney, getBookingStart } from '@/features/providerBooking/index.js';
import { useDashboardOverview, fetchDashboardOverview } from '@/features/dashboard/index.js';
import { Avatar } from '@/components/common/avatar/index.js';
import { getBookingManagementDetailsPath, getBookingManagementPath } from '@/routes/constants.js';
import { BookingMiniList, DashboardCard, DashboardStatCard, StatusBreakdown } from './components/index.js';
import { CHART_COLORS, SERIES_COLORS, axisTick, tooltipStyle } from './definitions/chartTheme.js';
import { buildThisWeekVisits, isSameDay, paidThisMonth, sum } from './definitions/dashboardMetrics.js';

const today = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

// An Admin's dashboard: their vertical at a glance - today's visits, bookings
// waiting on a provider, rejected bookings to reassign, cash collected, this
// week's visits, category mix and how each provider is doing. Powered by the
// backend vertical overview API.
export default function AdminDashboardPage() {
  const dispatch = useDispatch();
  const { user, role } = useAuth();
  const { items } = useAdminBookings();
  const { data: overview } = useDashboardOverview();
  const [now] = useState(() => new Date());

  useEffect(() => {
    dispatch(fetchDashboardOverview());
  }, [dispatch]);

  const vertical =
    overview?.vertical?.displayName ||
    overview?.vertical?.name ||
    user?.vertical_id?.display_name ||
    user?.vertical_id?.name ||
    'Your vertical';

  const listPath = getBookingManagementPath(role);
  const detailsFor = (booking) => getBookingManagementDetailsPath(role, booking.id);

  const data = useMemo(() => {
    if (overview) {
      const categories = (overview.categoryMix || []).map((row, index) => ({
        ...row,
        fill: SERIES_COLORS[index % SERIES_COLORS.length],
      }));

      return {
        todays: overview.todaysSchedule || [],
        todaysCount: overview.stats?.todaysVisits ?? (overview.todaysSchedule || []).length,
        inProgress: overview.stats?.inProgress ?? 0,
        pending: overview.stats?.pending ?? 0,
        rejected: overview.stats?.rejected ?? 0,
        completed: overview.stats?.completed ?? 0,
        cash: overview.stats?.cash ?? 0,
        commission: overview.stats?.commission ?? 0,
        week: overview.week || [],
        categories,
        providers: overview.providers || [],
        statusBookings: overview.recentBookings || items,
      };
    }

    // Offline / initial fallback
    const todays = items
      .filter((booking) => isSameDay(getBookingStart(booking), now) && !['rejected', 'cancelled'].includes(booking.status))
      .sort((a, b) => a.startHour - b.startHour);
    const paid = paidThisMonth(items, now);

    const categories = Object.entries(
      items.reduce((counts, booking) => ({ ...counts, [booking.service?.category || 'General']: (counts[booking.service?.category || 'General'] ?? 0) + 1 }), {}),
    )
      .map(([name, value], index) => ({ name, value, fill: SERIES_COLORS[index % SERIES_COLORS.length] }))
      .sort((a, b) => b.value - a.value);

    const providerIds = new Set(items.map((booking) => booking.provider?.id));
    const providers = DUMMY_PROVIDERS.filter((provider) => providerIds.has(provider.id))
      .map((provider) => {
        const own = items.filter((booking) => booking.provider?.id === provider.id);
        return {
          ...provider,
          active: own.filter((booking) => ['pending', 'accepted', 'upcoming', 'in_progress'].includes(booking.status)).length,
          rejected: own.filter((booking) => booking.status === 'rejected').length,
          cash: sum(paidThisMonth(own, now), (booking) => booking.cashPayment?.amountReceived || 0),
        };
      })
      .sort((a, b) => b.cash - a.cash);

    return {
      todays,
      inProgress: todays.filter((booking) => booking.status === 'in_progress').length,
      pending: items.filter((booking) => booking.status === 'pending').length,
      rejected: items.filter((booking) => booking.status === 'rejected').length,
      cash: sum(paid, (booking) => booking.cashPayment?.amountReceived || 0),
      commission: sum(paid, (booking) => booking.pricing?.commission || 0),
      week: buildThisWeekVisits(items, now),
      categories,
      providers,
      statusBookings: items,
    };
  }, [overview, items, now]);

  const stats = [
    {
      label: "Today's Visits",
      value: data.todays.length,
      hint: `${data.inProgress} in progress right now`,
      icon: CalendarCheck,
      tone: 'bg-teal-50 text-teal-600',
      to: listPath,
    },
    {
      label: 'Awaiting Provider',
      value: data.pending,
      hint: 'providers yet to accept',
      icon: Hourglass,
      tone: 'bg-amber-50 text-amber-600',
      to: `${listPath}?status=pending`,
    },
    {
      label: 'Rejected Bookings',
      value: data.rejected,
      hint: data.rejected ? `${data.rejected} rejected by provider` : 'no rejected bookings',
      icon: UserX,
      tone: 'bg-rose-50 text-rose-500',
      highlight: data.rejected > 0,
      to: `${listPath}?status=rejected`,
    },
    {
      label: 'Cash Collected',
      value: formatMoney(data.cash),
      hint: `this month · ${formatMoney(data.commission)} commission`,
      icon: Wallet,
      tone: 'bg-emerald-50 text-emerald-600',
      to: `${listPath}?status=completed`,
    },
  ];

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">{vertical} at a glance - today's visits, your providers and the cash coming in.</p>
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

      {/* Week chart + today's schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <DashboardCard className="lg:col-span-2" title="This Week's Visits" subtitle="Done vs still to come, Monday to Sunday">
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.week} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Bar dataKey="done" name="Done" stackId="visits" fill={CHART_COLORS.teal} barSize={28} />
                <Bar dataKey="upcoming" name="Still to come" stackId="visits" fill="#99f6e4" radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard title="Today's Schedule" subtitle={`${data.todaysCount} visit${data.todaysCount === 1 ? '' : 's'} in ${vertical}`} linkTo={listPath} bodyClassName="">
          <BookingMiniList
            bookings={data.todays.slice(0, 6)}
            now={now}
            linkFor={detailsFor}
            subline={(booking) => booking.provider?.name || 'Provider'}
            showAmount={false}
            emptyTitle="No visits today"
            emptyText="Today's accepted bookings will show here."
          />
        </DashboardCard>
      </div>

      {/* Category mix / status / providers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <DashboardCard title="Category Mix" subtitle="Bookings per service category">
          <div className="relative h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.categories} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3} stroke="none" />
                <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [`${value} bookings`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-slate-800">{data.categories.length}</span>
              <span className="text-xs text-slate-400">categories</span>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {data.categories.map((row) => (
              <li key={row.name} className="flex items-center gap-3 text-sm">
                <span className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.fill }} />
                <span className="flex-1 truncate text-slate-600">{row.name}</span>
                <span className="font-semibold text-slate-800 tabular-nums">{row.value}</span>
              </li>
            ))}
          </ul>
        </DashboardCard>

        <DashboardCard title="Booking Status" subtitle="Where every booking stands" linkTo={listPath}>
          <StatusBreakdown bookings={data.statusBookings} counts={overview?.statusBreakdown} listPath={listPath} />
        </DashboardCard>

        <DashboardCard title="Your Providers" subtitle="Live jobs and cash this month" bodyClassName="">
          <ul className="divide-y divide-slate-100">
            {data.providers.map((provider) => (
              <li key={provider.id} className="flex items-center gap-3 px-4 sm:px-6 py-3">
                <Avatar name={provider.name} className="h-9 w-9 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-semibold text-slate-800">
                    {provider.name}
                    {provider.rejected > 0 && (
                      <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">{provider.rejected} rejected</span>
                    )}
                  </p>
                  <p className="flex items-center gap-2 text-xs text-slate-400">
                    {provider.category}
                    <span className="inline-flex items-center gap-0.5">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      {Number(provider.rating || 0).toFixed(1)}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800 tabular-nums">{formatMoney(provider.cash)}</p>
                  <p className="text-[11px] text-slate-400">{provider.active} live job{provider.active === 1 ? '' : 's'}</p>
                </div>
              </li>
            ))}
          </ul>
        </DashboardCard>
      </div>
    </div>
  );
}
