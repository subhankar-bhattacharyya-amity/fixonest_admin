import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { CalendarDays, CalendarHeart, CalendarRange, Clock, Percent, RefreshCw, Settings, Trash2 } from 'lucide-react';
import { useAuth, ROLES } from '@/features/auth/index.js';
import {
  useWorkingHours,
  fetchWorkingHours,
  deleteHoliday,
  formatDuration,
  formatLongDate,
  nextOccurrence,
  relativeDayLabel,
  todayString,
  workingMinutes,
} from '@/features/workingHours/index.js';
import { ConfirmDialog } from '@/components/common/modal/index.js';
import {
  HolidayFormModal,
  HolidaySection,
  WorkingHoursSection,
  VerticalCommissionSection,
  AdminCommissionCard,
  ProviderPricingSection,
} from './components/index.js';

const COMMISSION_ID = 'vertical-commission-rate';
const HOLIDAYS_ID = 'manage-holidays';
const HOURS_ID = 'business-working-hours';

// Settings, tailored per role:
// - Super Admin: Business calendar (holidays, working hours) and platform-wide vertical commission rates
// - Admin (Vertical Admin): Professional commission rate setting and full working hours & holidays management
// - Provider: Vertical-wise prices and commission/payout breakdown for their assigned categories
export default function SettingsPage() {
  const { role } = useAuth();
  if (role === ROLES.SUPER_ADMIN) return <SuperAdminSettings />;
  if (role === ROLES.ADMIN) return <AdminSettings />;
  if (role === ROLES.PROVIDER) return <ProviderPricingSection />;
  return <NothingToConfigure />;
}

function SuperAdminSettings() {
  const dispatch = useDispatch();
  const { config, status } = useWorkingHours();

  // null (closed) | { holiday: null } (add) | { holiday } (edit)
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLoading = status === 'loading' || status === 'idle';
  const holidays = useMemo(() => config?.holidays ?? [], [config]);

  const load = useCallback(() => dispatch(fetchWorkingHours()), [dispatch]);
  useEffect(() => {
    load();
  }, [load]);

  const takenDates = useMemo(() => new Set(holidays.map((holiday) => holiday.date)), [holidays]);

  // Stats come from what's saved, not from unsaved edits in the form below.
  const stats = useMemo(() => {
    const schedule = config?.weeklySchedule ?? [];
    const today = todayString();
    const next = holidays
      .map((holiday) => ({ holiday, date: nextOccurrence(holiday, today) }))
      .filter((entry) => entry.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    return {
      openDays: schedule.filter((day) => day.isOpen).length,
      weeklyMinutes: schedule.reduce((sum, day) => sum + workingMinutes(day), 0),
      next,
    };
  }, [config, holidays]);

  const ready = status === 'succeeded';
  const dash = (value) => (ready ? value : '—');

  const cards = [
    {
      label: 'Open Days',
      value: dash(`${stats.openDays} / 7`),
      hint: 'days a week customers can book',
      icon: CalendarRange,
      tone: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Hours per Week',
      value: dash(formatDuration(stats.weeklyMinutes)),
      hint: 'bookable time, breaks excluded',
      icon: Clock,
      tone: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Next Holiday',
      value: dash(stats.next ? stats.next.holiday.title : 'None planned'),
      hint: stats.next
        ? `${formatLongDate(stats.next.date)} · ${relativeDayLabel(stats.next.date)}`
        : 'add one below to close the business',
      icon: CalendarHeart,
      tone: 'bg-amber-50 text-amber-600',
    },
  ];

  const openCreate = useCallback(() => setFormState({ holiday: null }), []);
  const closeForm = useCallback(() => setFormState(null), []);
  const closeDelete = useCallback(() => setDeleteTarget(null), []);

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await dispatch(deleteHoliday(deleteTarget._id)).unwrap();
      toast.success(result.message);
      setDeleteTarget(null);
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    } finally {
      setIsDeleting(false);
    }
  };

  const jumpTo = (targetId) => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Header - same layout and classes as VerticalManagementPage's header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Set when Fixonest is open for bookings, and the days it closes.</p>
        </div>
        <div className="flex items-center gap-2">
          <nav aria-label="Settings sections" className="hidden md:flex items-center gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">
            <JumpLink icon={Percent} label="Commission" onClick={() => jumpTo('vertical-commission-section')} />
            <JumpLink icon={Clock} label="Working Hours" onClick={() => jumpTo(HOURS_ID)} />
            <JumpLink icon={CalendarDays} label="Holidays" onClick={() => jumpTo(HOLIDAYS_ID)} />
          </nav>
          <button
            type="button"
            onClick={load}
            disabled={isLoading}
            aria-label="Refresh settings"
            title="Refresh"
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats - same card markup and 3-column grid as VerticalManagementPage */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {cards.map((stat, index) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow animate-rise-in"
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
            <p className="mt-3 text-xs text-slate-400 truncate">{stat.hint}</p>
          </div>
        ))}
      </div>

      <VerticalCommissionSection />

      <HolidaySection
        id={HOLIDAYS_ID}
        holidays={holidays}
        isLoading={isLoading}
        onAdd={openCreate}
        onEdit={(holiday) => setFormState({ holiday })}
        onDelete={setDeleteTarget}
      />

      <WorkingHoursSection id={HOURS_ID} config={config} isLoading={isLoading} />

      {formState && (
        <HolidayFormModal
          holiday={formState.holiday}
          takenDates={takenDates}
          onClose={closeForm}
          onSaved={closeForm}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this holiday?"
          icon={Trash2}
          confirmLabel="Yes, Delete"
          busy={isDeleting}
          onCancel={closeDelete}
          onConfirm={confirmDelete}
          message={
            <>
              <span className="font-semibold text-slate-700">“{deleteTarget.title}”</span> on{' '}
              {formatLongDate(deleteTarget.date)} will be removed.
              <span className="mt-2 block text-xs text-slate-400">
                Customers will be able to book on that date with the normal working hours.
              </span>
            </>
          }
        />
      )}
    </div>
  );
}

function AdminSettings() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { config, status } = useWorkingHours();

  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [commissionRate, setCommissionRate] = useState(null);
  const [verticalData, setVerticalData] = useState(null);

  const handleCommissionUpdated = useCallback((rate, data) => {
    setCommissionRate((prev) => (prev !== rate ? rate : prev));
    if (data) {
      setVerticalData((prev) => (prev?._id !== data._id || prev?.commissionRate !== data.commissionRate ? data : prev));
    }
  }, []);

  const isLoading = status === 'loading' || status === 'idle';
  const holidays = useMemo(() => config?.holidays ?? [], [config]);

  const load = useCallback(() => dispatch(fetchWorkingHours()), [dispatch]);
  useEffect(() => {
    load();
  }, [load]);

  const takenDates = useMemo(() => new Set(holidays.map((holiday) => holiday.date)), [holidays]);

  const stats = useMemo(() => {
    const schedule = config?.weeklySchedule ?? [];
    const today = todayString();
    const next = holidays
      .map((holiday) => ({ holiday, date: nextOccurrence(holiday, today) }))
      .filter((entry) => entry.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    return {
      openDays: schedule.filter((day) => day.isOpen).length,
      weeklyMinutes: schedule.reduce((sum, day) => sum + workingMinutes(day), 0),
      next,
    };
  }, [config, holidays]);

  const ready = status === 'succeeded';
  const dash = (value) => (ready ? value : '—');

  const verticalName =
    verticalData?.display_name ||
    verticalData?.name ||
    user?.vertical_id?.display_name ||
    user?.vertical_id?.name ||
    'Your Vertical';

  const jumpTo = (targetId) => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const cards = [
    {
      label: 'Commission Rate',
      value: commissionRate !== null ? `${commissionRate}%` : '—',
      hint: commissionRate !== null ? `${Math.max(0, 100 - commissionRate)}% to provider` : 'Platform fee',
      icon: Percent,
      tone: 'bg-teal-50 text-teal-600',
      onClick: () => jumpTo(COMMISSION_ID),
    },
    {
      label: 'Open Days',
      value: dash(`${stats.openDays} / 7`),
      hint: 'operating days a week',
      icon: CalendarRange,
      tone: 'bg-indigo-50 text-indigo-600',
      onClick: () => jumpTo(HOURS_ID),
    },
    {
      label: 'Weekly Hours',
      value: dash(formatDuration(stats.weeklyMinutes)),
      hint: 'bookable operating capacity',
      icon: Clock,
      tone: 'bg-emerald-50 text-emerald-600',
      onClick: () => jumpTo(HOURS_ID),
    },
    {
      label: 'Next Holiday',
      value: dash(stats.next ? stats.next.holiday.title : 'None planned'),
      hint: stats.next
        ? `${formatLongDate(stats.next.date)} · ${relativeDayLabel(stats.next.date)}`
        : 'scheduled business closures',
      icon: CalendarHeart,
      tone: 'bg-amber-50 text-amber-600',
      onClick: () => jumpTo(HOLIDAYS_ID),
    },
  ];

  const openCreate = useCallback(() => setFormState({ holiday: null }), []);
  const closeForm = useCallback(() => setFormState(null), []);
  const closeDelete = useCallback(() => setDeleteTarget(null), []);

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await dispatch(deleteHoliday(deleteTarget._id)).unwrap();
      toast.success(result.message);
      setDeleteTarget(null);
    } catch {
      // Handled globally
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Vertical Settings & Operations</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure commission rates, weekly working hours, and scheduled holidays for {verticalName}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <nav aria-label="Settings sections" className="hidden md:flex items-center gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">
            <JumpLink icon={Percent} label="Commission" onClick={() => jumpTo(COMMISSION_ID)} />
            <JumpLink icon={Clock} label="Working Hours" onClick={() => jumpTo(HOURS_ID)} />
            <JumpLink icon={CalendarDays} label="Holidays" onClick={() => jumpTo(HOLIDAYS_ID)} />
          </nav>
          <button
            type="button"
            onClick={load}
            disabled={isLoading}
            aria-label="Refresh settings"
            title="Refresh"
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {cards.map((stat, index) => (
          <button
            key={stat.label}
            type="button"
            onClick={stat.onClick}
            className="text-left bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all animate-rise-in focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800 truncate">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${stat.tone}`}>
                <stat.icon size={22} />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400 truncate">{stat.hint}</p>
          </button>
        ))}
      </div>

      {/* Vertical Commission Section */}
      <AdminCommissionCard
        id={COMMISSION_ID}
        onCommissionUpdated={handleCommissionUpdated}
      />

      {/* Business Working Hours Section */}
      <WorkingHoursSection id={HOURS_ID} config={config} isLoading={isLoading} />

      {/* Holidays & Closures Section */}
      <HolidaySection
        id={HOLIDAYS_ID}
        holidays={holidays}
        isLoading={isLoading}
        onAdd={openCreate}
        onEdit={(holiday) => setFormState({ holiday })}
        onDelete={setDeleteTarget}
      />

      {formState && (
        <HolidayFormModal
          holiday={formState.holiday}
          takenDates={takenDates}
          onClose={closeForm}
          onSaved={closeForm}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this holiday?"
          icon={Trash2}
          confirmLabel="Yes, Delete"
          busy={isDeleting}
          onCancel={closeDelete}
          onConfirm={confirmDelete}
          message={
            <>
              <span className="font-semibold text-slate-700">“{deleteTarget.title}”</span> on{' '}
              {formatLongDate(deleteTarget.date)} will be removed.
              <span className="mt-2 block text-xs text-slate-400">
                Customers will be able to book on that date with the normal working hours.
              </span>
            </>
          }
        />
      )}
    </div>
  );
}

function JumpLink({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-teal-50 hover:text-teal-700 transition-colors"
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

// Admins and providers have no settings yet. Profile details and password
// changes live on the My Profile page (pages/profile/).
function NothingToConfigure() {
  return (
    <div className="space-y-6 animate-rise-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Settings</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center px-6 py-16 sm:py-24">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-5">
          <Settings size={30} />
        </div>
        <h2 className="text-lg font-bold text-slate-800">No content yet</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          There's nothing to configure here for now. Settings will appear on this page once they're available.
        </p>
      </div>
    </div>
  );
}
