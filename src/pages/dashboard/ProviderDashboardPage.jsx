import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  HandCoins,
  MapPin,
  Phone,
  Sparkles,
  Star,
  Wallet,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/features/auth/index.js';
import {
  BookingStatusBadge,
  formatBookingNumber,
  formatMoney,
  formatRelativeVisit,
  formatSlot,
  getBookingStart,
  getMapsUrl,
  useProviderBookings,
} from '@/features/providerBooking/index.js';
import { useDashboardOverview, fetchDashboardOverview } from '@/features/dashboard/index.js';
import { ROUTES, getProviderBookingDetailsPath } from '@/routes/constants.js';
import { BookingMiniList, DashboardCard, DashboardStatCard } from './components/index.js';
import { CHART_COLORS, axisTick, tooltipStyle } from './definitions/chartTheme.js';
import { buildDailyEarnings, formatCompactMoney, isSameDay, paidThisMonth, sum } from './definitions/dashboardMetrics.js';
import { PROVIDER_PERFORMANCE } from './definitions/providerDashboard.data.js';

const today = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

// The provider's own dashboard (the backend's "provider" role): new requests,
// today's jobs, the next job, cash still to collect, earnings and performance.
// Powered by the backend provider overview API.
export default function ProviderDashboardPage() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { items } = useProviderBookings();
  const { data: overview } = useDashboardOverview();
  const [now] = useState(() => new Date());

  useEffect(() => {
    dispatch(fetchDashboardOverview());
  }, [dispatch]);

  const firstName =
    overview?.provider?.firstName ||
    user?.first_name ||
    user?.fullName?.trim().split(/\s+/)[0] ||
    'there';

  const detailsFor = (booking) => getProviderBookingDetailsPath(formatBookingNumber(booking) || booking.id);

  const data = useMemo(() => {
    if (overview) {
      return {
        todays: overview.todaysJobs || [],
        todaysCount: overview.stats?.todaysJobs ?? (overview.todaysJobs || []).length,
        todaysDone: overview.stats?.todaysDone ?? 0,
        requests: overview.newRequests || [],
        requestsCount: overview.stats?.newRequests ?? (overview.newRequests || []).length,
        next: overview.nextJob || null,
        completedCount: overview.stats?.completedCount ?? 0,
        earned: overview.stats?.earned ?? 0,
        collected: overview.stats?.collected ?? 0,
        paidCount: overview.stats?.paidCount ?? 0,
        week: overview.week || [],
        weekTotal: overview.weekTotal ?? 0,
        weekJobs: overview.weekJobs ?? 0,
        performanceRating: Number(overview.performance?.rating ?? 4.6),
        performanceReviews: Number(overview.performance?.reviews ?? 148),
        performanceRates: {
          acceptanceRate: overview.performance?.acceptanceRate ?? 95,
          completionRate: overview.performance?.completionRate ?? 98,
          onTimeRate: overview.performance?.onTimeRate ?? 98,
        },
      };
    }

    // Offline / initial fallback
    const todays = items
      .filter((booking) => isSameDay(getBookingStart(booking), now) && !['pending', 'rejected', 'cancelled'].includes(booking.status))
      .sort((a, b) => a.startHour - b.startHour);
    const requests = items
      .filter((booking) => booking.status === 'pending')
      .sort((a, b) => getBookingStart(a) - getBookingStart(b));
    const completedList = items.filter((booking) => ['completed', 'paid'].includes(booking.status));
    const paid = paidThisMonth(items, now);
    const next =
      items.find((booking) => booking.status === 'in_progress') ??
      items
        .filter((booking) => ['accepted', 'upcoming'].includes(booking.status) && getBookingStart(booking) >= new Date(now.getTime() - 3600000))
        .sort((a, b) => getBookingStart(a) - getBookingStart(b))[0] ??
      null;
    const week = buildDailyEarnings(items, now, 7);

    return {
      todays,
      todaysCount: todays.length,
      todaysDone: todays.filter((booking) => ['completed', 'paid'].includes(booking.status)).length,
      requests,
      requestsCount: requests.length,
      next,
      completedCount: completedList.length,
      earned: sum(paid, (booking) => booking.pricing?.earning || 0),
      collected: sum(paid, (booking) => booking.cashPayment?.amountReceived || 0),
      paidCount: paid.length,
      week,
      weekTotal: sum(week, (point) => point.earnings),
      weekJobs: sum(week, (point) => point.jobs),
      performanceRating: Number(PROVIDER_PERFORMANCE.rating || 4.6),
      performanceReviews: Number(PROVIDER_PERFORMANCE.reviews || 148),
      performanceRates: {
        acceptanceRate: PROVIDER_PERFORMANCE.acceptanceRate,
        completionRate: PROVIDER_PERFORMANCE.completionRate,
        onTimeRate: PROVIDER_PERFORMANCE.onTimeRate,
      },
    };
  }, [overview, items, now]);

  const stats = [
    {
      label: 'New Requests',
      value: data.requestsCount,
      hint: data.requestsCount ? 'waiting for your answer' : 'all caught up',
      icon: BellRing,
      tone: 'bg-amber-50 text-amber-600',
      highlight: data.requestsCount > 0,
      to: `${ROUTES.PROVIDER_BOOKINGS}?status=pending`,
    },
    {
      label: "Today's Jobs",
      value: data.todaysCount,
      hint: `${data.todaysDone} done so far`,
      icon: CalendarCheck,
      tone: 'bg-teal-50 text-teal-600',
      to: ROUTES.PROVIDER_BOOKINGS,
    },
    {
      label: 'Completed Jobs',
      value: data.completedCount,
      hint: `${data.completedCount} job${data.completedCount === 1 ? '' : 's'} completed`,
      icon: CheckCircle2,
      tone: 'bg-emerald-50 text-emerald-600',
      to: `${ROUTES.PROVIDER_BOOKINGS}?status=completed`,
    },
    {
      label: 'Earned This Month',
      value: formatMoney(data.earned),
      hint: `from completed bookings`,
      icon: Wallet,
      tone: 'bg-teal-50 text-teal-600',
      to: `${ROUTES.PROVIDER_BOOKINGS}?status=completed`,
    },
  ];

  const performance = [
    { label: 'Acceptance rate', value: data.performanceRates.acceptanceRate },
    { label: 'Completion rate', value: data.performanceRates.completionRate },
    { label: 'On-time arrival', value: data.performanceRates.onTimeRate },
  ];

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Hello, {firstName}!</h1>
          <p className="text-sm text-slate-500 mt-1">{today.format(now)} - here's your day.</p>
        </div>
        <Link
          to={ROUTES.PROVIDER_BOOKINGS}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-teal-500/30 hover:bg-teal-600 transition-colors"
        >
          My Bookings
          <ArrowRight size={15} />
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, index) => (
          <DashboardStatCard key={stat.label} {...stat} index={index} />
        ))}
      </div>

      {/* Next job / today / requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <NextJobCard booking={data.next} now={now} linkTo={data.next ? detailsFor(data.next) : null} />

        <DashboardCard title="Today's Jobs" subtitle={`${data.todaysCount} on your schedule`} linkTo={ROUTES.PROVIDER_BOOKINGS} bodyClassName="">
          <BookingMiniList
            bookings={data.todays.slice(0, 5)}
            now={now}
            linkFor={detailsFor}
            subline={(booking) => booking.customer?.name || 'Customer'}
            emptyTitle="Nothing scheduled today"
            emptyText="Accepted jobs for today show up here."
          />
        </DashboardCard>

        <DashboardCard
          title="New Requests"
          subtitle="Accept or reject from the booking"
          linkTo={`${ROUTES.PROVIDER_BOOKINGS}?status=pending`}
          bodyClassName=""
        >
          <BookingMiniList
            bookings={data.requests.slice(0, 5)}
            now={now}
            linkFor={detailsFor}
            subline={(booking) => `${(booking.address?.area || 'Local area').split(',').pop().trim()}`}
            emptyTitle="No new requests"
            emptyText="We'll show them here as soon as a customer books you."
          />
        </DashboardCard>
      </div>

      {/* Earnings + performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <DashboardCard
          className="lg:col-span-2"
          title="Earnings - Last 7 Days"
          subtitle={`${formatMoney(data.weekTotal)} from ${data.weekJobs} job${data.weekJobs === 1 ? '' : 's'}, after commission`}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.week} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashEarningsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.teal} stopOpacity={1} />
                    <stop offset="100%" stopColor={CHART_COLORS.teal} stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} tickFormatter={formatCompactMoney} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value, _name, item) => [`${formatMoney(value)} · ${item.payload.jobs} job${item.payload.jobs === 1 ? '' : 's'}`, 'Earned']}
                />
                <Bar dataKey="earnings" fill="url(#dashEarningsFill)" radius={[8, 8, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard title="Your Performance" subtitle="What customers see on your profile">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 shrink-0 rounded-2xl bg-amber-50 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-amber-600 leading-none">{data.performanceRating.toFixed(1)}</span>
            </div>
            <div>
              <div className="flex items-center gap-0.5" aria-label={`${data.performanceRating} out of 5`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    className={star <= Math.round(data.performanceRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                  />
                ))}
              </div>
              <p className="mt-1 text-sm text-slate-500">{data.performanceReviews} reviews</p>
            </div>
          </div>
          <dl className="mt-6 space-y-4">
            {performance.map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-slate-500">{row.label}</dt>
                  <dd className="font-bold text-slate-800">{row.value}%</dd>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-teal-500 transition-all duration-700" style={{ width: `${row.value}%` }} />
                </div>
              </div>
            ))}
          </dl>
          <p className="mt-5 flex items-start gap-2 rounded-xl bg-teal-50 px-3 py-2.5 text-xs text-teal-800">
            <Sparkles size={14} className="shrink-0 mt-0.5" />
            Accepting requests quickly keeps you at the top of customers' search results.
          </p>
        </DashboardCard>
      </div>
    </div>
  );
}

// The job happening now, or the next one coming up, with quick Call / Map
// buttons.
function NextJobCard({ booking, now, linkTo }) {
  if (!booking) {
    return (
      <DashboardCard title="Next Job">
        <div className="flex flex-col items-center text-center py-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <CalendarCheck size={22} />
          </div>
          <p className="text-sm font-semibold text-slate-700">No upcoming jobs</p>
          <p className="text-xs text-slate-400 mt-0.5">Accept a request to fill your schedule.</p>
        </div>
      </DashboardCard>
    );
  }

  const isNow = booking.status === 'in_progress';
  const customerPhone = booking.customer?.phone || '';
  const areaText = booking.address?.area || 'Local area';
  const cityText = booking.address?.city || '';
  const totalAmount = booking.pricing?.total || 0;
  const mapsTargetUrl = booking.mapsUrl || getMapsUrl(booking.address);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-teal-500 to-teal-700 p-5 sm:p-6 text-white shadow-lg shadow-teal-600/20 animate-rise-in">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-14 -left-8 h-36 w-36 rounded-full bg-white/5" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-100">{isNow ? 'On the job now' : 'Next job'}</span>
          <BookingStatusBadge status={booking.status} className="bg-white/90!" />
        </div>
        <h2 className="mt-3 text-xl font-bold leading-snug">{booking.service?.name}</h2>
        <p className="mt-1 text-sm text-teal-50">{booking.customer?.name}</p>

        <div className="mt-5 space-y-2 text-sm">
          <p className="flex items-center gap-2">
            <Clock size={15} className="shrink-0 text-teal-100" />
            {formatSlot(booking)}
            <span className="font-semibold">· {formatRelativeVisit(booking, now)}</span>
          </p>
          <p className="flex items-start gap-2">
            <MapPin size={15} className="shrink-0 mt-0.5 text-teal-100" />
            <span className="line-clamp-2">
              {areaText}{cityText ? `, ${cityText}` : ''}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <Wallet size={15} className="shrink-0 text-teal-100" />
            Booking total: {formatMoney(totalAmount)}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {customerPhone ? (
            <a
              href={`tel:${customerPhone.replace(/\s/g, '')}`}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25 transition-colors"
            >
              <Phone size={14} />
              Call
            </a>
          ) : (
            <span className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold opacity-50 cursor-not-allowed">
              <Phone size={14} />
              Call
            </span>
          )}
          <a
            href={mapsTargetUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25 transition-colors"
          >
            <ExternalLink size={14} />
            Map
          </a>
          <Link
            to={linkTo}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 transition-colors"
          >
            Open
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
