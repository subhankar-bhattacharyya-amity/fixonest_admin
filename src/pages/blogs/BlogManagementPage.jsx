import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BadgeCheck,
  BookOpenText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  PauseCircle,
  PenLine,
  PlayCircle,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '@/features/auth/index.js';
import {
  useBlogs,
  BLOGS_PER_PAGE,
  BLOG_HIGHLIGHT_LIMIT,
  fetchBlogs,
  fetchBlogSummary,
  fetchBlogCategoryOptions,
  updateBlogFlags,
  deleteBlog,
} from '@/features/blog/index.js';
import { ConfirmDialog } from '@/components/common/modal/index.js';
import { getBlogCreatePath, getBlogEditPath } from '@/routes/constants.js';
import { BlogTable } from './components/index.js';

const SEARCH_DEBOUNCE_MS = 350;

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'hidden', label: 'Hidden' },
];

const HIGHLIGHT_FILTERS = [
  { value: '', label: 'All blogs' },
  { value: 'popular', label: 'Popular only' },
  { value: 'trendy', label: 'Trendy only' },
];

const selectClass = 'input-field bg-white appearance-none pr-9 text-sm text-slate-700 cursor-pointer';

// "Blog Management", for the Super Admin and the Admin. Lists every blog and
// lets them publish/hide it, mark it popular or trendy, and delete it; writing
// and editing happen on BlogEditorPage. Search, the filters, paging and the
// counts are all done by the server.
export default function BlogManagementPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { items, meta, status, summary, categories } = useBlogs();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [highlightFilter, setHighlightFilter] = useState('');

  const [statusTarget, setStatusTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  // "<blogId>:<flag>" of the popular/trendy toggle that's being saved.
  const [pendingFlag, setPendingFlag] = useState(null);

  const isLoading = status === 'loading' || status === 'idle';
  const total = meta?.total ?? items.length;
  const totalPages = Math.max(meta?.totalPages ?? 1, 1);
  const hasFilters = Boolean(search || statusFilter || categoryFilter || highlightFilter);
  const counts = summary.data;
  const summaryReady = summary.status === 'succeeded';
  const createPath = getBlogCreatePath(role);

  // Debounce typing, and go back to page 1 whenever the query changes.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadTable = useCallback(
    () =>
      dispatch(
        fetchBlogs({
          page,
          perPage: BLOGS_PER_PAGE,
          search,
          visibility: statusFilter,
          blogCategoryId: categoryFilter,
          highlight: highlightFilter,
        }),
      ),
    [dispatch, page, search, statusFilter, categoryFilter, highlightFilter],
  );
  const loadSummary = useCallback(() => dispatch(fetchBlogSummary()), [dispatch]);

  useEffect(() => {
    loadTable();
  }, [loadTable]);

  useEffect(() => {
    loadSummary();
    dispatch(fetchBlogCategoryOptions());
  }, [loadSummary, dispatch]);

  const refreshAll = useCallback(() => {
    loadTable();
    loadSummary();
  }, [loadTable, loadSummary]);

  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };
  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setHighlightFilter('');
    setPage(1);
  };

  const openEdit = useCallback((blog) => navigate(getBlogEditPath(role, blog._id)), [navigate, role]);

  // Popular and trendy are one-click toggles - no confirmation, since either
  // is undone with the same click. The backend caps each at five.
  const toggleFlag = async (blog, flag) => {
    setPendingFlag(`${blog._id}:${flag}`);
    try {
      const turnedOn = !blog[flag];
      await dispatch(updateBlogFlags({ id: blog._id, changes: { [flag]: turnedOn } })).unwrap();
      const label = flag === 'isPopular' ? 'popular' : 'trendy';
      toast.success(turnedOn ? `Marked as ${label}` : `No longer ${label}`);
      refreshAll();
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    } finally {
      setPendingFlag(null);
    }
  };

  const closeStatus = useCallback(() => setStatusTarget(null), []);
  const confirmStatus = async () => {
    const publish = !statusTarget.isPublished;
    setIsBusy(true);
    try {
      await dispatch(updateBlogFlags({ id: statusTarget._id, changes: { isPublished: publish } })).unwrap();
      toast.success(publish ? 'Blog published' : 'Blog hidden');
      setStatusTarget(null);
      refreshAll();
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    } finally {
      setIsBusy(false);
    }
  };

  const closeDelete = useCallback(() => setDeleteTarget(null), []);
  const confirmDelete = async () => {
    // Deleting the only row of a later page would leave that page empty.
    const wasLastRowOnPage = items.length === 1 && page > 1;
    setIsBusy(true);
    try {
      const result = await dispatch(deleteBlog(deleteTarget._id)).unwrap();
      toast.success(result.message);
      setDeleteTarget(null);
      if (wasLastRowOnPage) {
        // The page change refetches the table.
        setPage(page - 1);
        loadSummary();
      } else {
        refreshAll();
      }
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    } finally {
      setIsBusy(false);
    }
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * BLOGS_PER_PAGE + 1;
  const rangeEnd = Math.min(page * BLOGS_PER_PAGE, total);
  const dash = (value) => (summaryReady ? value : '—');

  const stats = [
    {
      label: 'Total Blogs',
      value: dash(counts.total),
      hint: 'written so far',
      icon: BookOpenText,
      tone: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Published',
      value: dash(counts.published),
      hint: 'live on the customer site',
      icon: BadgeCheck,
      tone: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Hidden',
      value: dash(counts.unpublished),
      hint: 'not visible to customers',
      icon: EyeOff,
      tone: 'bg-slate-100 text-slate-500',
    },
    {
      label: 'Highlighted',
      value: dash(counts.popular + counts.trendy),
      hint: summaryReady
        ? `${counts.popular}/${BLOG_HIGHLIGHT_LIMIT} popular · ${counts.trendy}/${BLOG_HIGHLIGHT_LIMIT} trendy`
        : 'popular and trendy picks',
      icon: Sparkles,
      tone: 'bg-amber-50 text-amber-600',
    },
  ];

  const isHiding = Boolean(statusTarget?.isPublished);

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Header - same layout and classes as VerticalManagementPage's header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Blog Management</h1>
          <p className="text-sm text-slate-500 mt-1">Write, publish and highlight the articles customers read.</p>
        </div>
        <Link
          to={createPath}
          className="btn-primary shrink-0 w-full sm:w-auto px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/30"
        >
          <PenLine size={18} />
          Write Blog
        </Link>
      </div>

      {/* Stats - same card markup as VerticalManagementPage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, index) => (
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

      {/* Listing */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Same header bar as VerticalManagementPage's "All Verticals" */}
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800">All Blogs</h2>
            <p className="text-xs text-slate-400 mt-0.5">Newest first</p>
          </div>
          <button
            type="button"
            onClick={refreshAll}
            disabled={isLoading}
            aria-label="Refresh list"
            title="Refresh"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Toolbar - its own rows under the header bar */}
        <div className="space-y-3 px-4 py-3 sm:px-6 border-b border-slate-100 bg-slate-50/40">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 min-w-0">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by title, slug or summary"
                aria-label="Search blogs"
                className="input-field bg-white pl-10 pr-9"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Filter by status">
              {STATUS_FILTERS.map((option) => (
                <button
                  key={option.value || 'all'}
                  type="button"
                  onClick={() => changeFilter(setStatusFilter)(option.value)}
                  aria-pressed={statusFilter === option.value}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === option.value ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:items-center">
            <FilterSelect
              label="Filter by category"
              value={categoryFilter}
              onChange={changeFilter(setCategoryFilter)}
              className="lg:w-64"
            >
              <option value="">All categories</option>
              {categories.items.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Filter by highlight"
              value={highlightFilter}
              onChange={changeFilter(setHighlightFilter)}
              className="lg:w-48"
            >
              {HIGHLIGHT_FILTERS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FilterSelect>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="sm:col-span-2 lg:ml-auto inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X size={14} />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {!isLoading && items.length === 0 ? (
          hasFilters ? (
            <NoMatches onClear={clearFilters} />
          ) : (
            <EmptyState createPath={createPath} />
          )
        ) : (
          <BlogTable
            blogs={items}
            startIndex={(page - 1) * BLOGS_PER_PAGE}
            isLoading={isLoading}
            pendingFlag={pendingFlag}
            onEdit={openEdit}
            onToggleFlag={toggleFlag}
            onToggleStatus={setStatusTarget}
            onDelete={setDeleteTarget}
          />
        )}

        {total > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3.5 sm:px-6 border-t border-slate-100 bg-slate-50/60">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              Showing <span className="font-semibold text-slate-700">{rangeStart}</span>–
              <span className="font-semibold text-slate-700">{rangeEnd}</span> of{' '}
              <span className="font-semibold text-slate-700">{total}</span>
            </p>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => current - 1)}
                  disabled={page <= 1 || isLoading}
                  aria-label="Previous page"
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-medium text-slate-600 tabular-nums px-1">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={page >= totalPages || isLoading}
                  aria-label="Next page"
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {statusTarget && (
        <ConfirmDialog
          title={isHiding ? 'Hide this blog?' : 'Publish this blog?'}
          icon={isHiding ? PauseCircle : PlayCircle}
          tone={isHiding ? 'warning' : 'success'}
          confirmLabel={isHiding ? 'Yes, Hide' : 'Yes, Publish'}
          busy={isBusy}
          onCancel={closeStatus}
          onConfirm={confirmStatus}
          message={
            isHiding ? (
              <>
                <span className="font-semibold text-slate-700">{statusTarget.title}</span> will disappear from the
                customer site until you publish it again.
                {(statusTarget.isPopular || statusTarget.isTrendy) && (
                  <span className="mt-2 block text-xs text-slate-400">
                    It will also be taken off the Popular and Trendy lists.
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-700">{statusTarget.title}</span> will be visible on the
                customer site.
              </>
            )
          }
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete this blog?"
          icon={Trash2}
          confirmLabel="Yes, Delete"
          busy={isBusy}
          onCancel={closeDelete}
          onConfirm={confirmDelete}
          message={
            <>
              <span className="font-semibold text-slate-700">{deleteTarget.title}</span> will be removed from this list
              and from the customer site.
              <span className="mt-2 block text-xs text-slate-400">
                To take it down only for a while, hide it instead. Its title and slug become free to use again.
              </span>
            </>
          }
        />
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, className = '', children }) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className={selectClass}
      >
        {children}
      </select>
      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

function EmptyState({ createPath }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-16">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-3xl bg-teal-400/20 blur-xl" />
        <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30">
          <BookOpenText size={28} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-800">No blogs yet</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        Share tips, guides and home-care advice with your customers. Write your first blog to get started.
      </p>
      <Link
        to={createPath}
        className="mt-6 px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
      >
        <PenLine size={18} />
        Write your first blog
      </Link>
    </div>
  );
}

function NoMatches({ onClear }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-14">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
        <Search size={24} />
      </div>
      <h3 className="text-base font-bold text-slate-800">No blogs match these filters</h3>
      <p className="text-sm text-slate-500 mt-1">Try a different search, or clear the filters.</p>
      <button
        type="button"
        onClick={onClear}
        className="mt-5 px-4 py-2 rounded-xl text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
      >
        Clear filters
      </button>
    </div>
  );
}
