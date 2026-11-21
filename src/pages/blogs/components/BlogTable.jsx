import { CalendarDays, Clock3, Flame, ImageOff, Loader2, PauseCircle, PencilLine, PlayCircle, Trash2, TrendingUp, UserRound } from 'lucide-react';
import { buildBlogImageUrl, getBlogVisibility } from '@/features/blog/index.js';
import { formatDate } from '@/utils/formatDate.js';

// Blogs listing: a table from `xl` up, stacked cards below it (a blog row
// carries too much to fit a narrower table). Purely presentational - the page
// owns data loading, filters and dialogs.
export default function BlogTable({
  blogs,
  startIndex = 0,
  isLoading,
  pendingFlag,
  onEdit,
  onToggleFlag,
  onToggleStatus,
  onDelete,
}) {
  if (isLoading && blogs.length === 0) return <TableSkeleton />;

  const actions = { onEdit, onToggleStatus, onDelete };
  const highlights = { pendingFlag, onToggleFlag };

  return (
    <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-60' : ''}`}>
      {/* Desktop */}
      <div className="hidden xl:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th scope="col" className="w-14 px-6 py-3.5">#</th>
              <th scope="col" className="px-6 py-3.5">Blog</th>
              <th scope="col" className="px-6 py-3.5">Category</th>
              <th scope="col" className="px-6 py-3.5">Highlights</th>
              <th scope="col" className="px-6 py-3.5">Status</th>
              <th scope="col" className="px-6 py-3.5">Created</th>
              <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {blogs.map((blog, index) => (
              <tr
                key={blog._id}
                className="group hover:bg-teal-50/30 transition-colors animate-rise-in"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <td className="px-6 py-4 text-slate-400 font-medium tabular-nums">{startIndex + index + 1}</td>
                <td className="px-6 py-4 max-w-md">
                  <BlogIdentity blog={blog} onEdit={onEdit} />
                </td>
                <td className="px-6 py-4">
                  <CategoryChip blog={blog} />
                </td>
                <td className="px-6 py-4">
                  <HighlightToggles blog={blog} {...highlights} />
                </td>
                <td className="px-6 py-4">
                  <StatusPill isPublished={blog.isPublished} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-slate-600">{formatDate(new Date(blog.createdAt))}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{blog.readingTimeInMin ?? 1} min read</p>
                </td>
                <td className="px-6 py-4">
                  <RowActions blog={blog} {...actions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet / small laptop */}
      <ul className="xl:hidden divide-y divide-slate-100">
        {blogs.map((blog, index) => (
          <li key={blog._id} className="p-4 animate-rise-in" style={{ animationDelay: `${index * 40}ms` }}>
            <BlogIdentity blog={blog} onEdit={onEdit} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusPill isPublished={blog.isPublished} />
              <CategoryChip blog={blog} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={13} />
                {formatDate(new Date(blog.createdAt))}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 size={13} />
                {blog.readingTimeInMin ?? 1} min read
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-slate-100 pt-3">
              <HighlightToggles blog={blog} {...highlights} />
              <RowActions blog={blog} {...actions} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Cover thumbnail + title (opens the editor) + author.
function BlogIdentity({ blog, onEdit }) {
  const coverUrl = buildBlogImageUrl(blog.coverImage);
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="relative shrink-0">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            loading="lazy"
            className="w-16 h-12 rounded-xl object-cover bg-slate-100 ring-1 ring-slate-200"
          />
        ) : (
          <span
            className="w-16 h-12 rounded-xl bg-slate-50 text-slate-300 ring-1 ring-slate-200 flex items-center justify-center"
            title="No cover image"
          >
            <ImageOff size={18} />
          </span>
        )}
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${getBlogVisibility(blog.isPublished).dot}`}
          aria-hidden="true"
        />
      </span>
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onEdit(blog)}
          title={blog.title}
          className="block max-w-full text-left font-semibold text-slate-800 line-clamp-2 hover:text-teal-700 transition-colors focus:outline-none focus-visible:underline"
        >
          {blog.title}
        </button>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400 min-w-0">
          <UserRound size={12} className="shrink-0" />
          <span className="truncate">{blog.writtenBy}</span>
        </p>
      </div>
    </div>
  );
}

function CategoryChip({ blog }) {
  const name = blog.blogCategoryId?.name;
  if (!name) return <span className="text-xs italic text-slate-400">No category</span>;
  return (
    <span className="inline-flex max-w-44 items-center rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-600/10">
      <span className="truncate">{name}</span>
    </span>
  );
}

function StatusPill({ isPublished }) {
  const { label, badge, dot } = getBlogVisibility(isPublished);
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

const HIGHLIGHTS = [
  {
    flag: 'isPopular',
    label: 'Popular',
    icon: Flame,
    on: 'bg-amber-50 text-amber-700 ring-amber-500/25 hover:bg-amber-100',
  },
  {
    flag: 'isTrendy',
    label: 'Trendy',
    icon: TrendingUp,
    on: 'bg-sky-50 text-sky-700 ring-sky-500/25 hover:bg-sky-100',
  },
];

// Two switch-like chips: click to add the blog to, or take it off, the
// customer site's "Popular" and "Trendy" lists. Only a published blog can be
// highlighted (the backend refuses it otherwise).
function HighlightToggles({ blog, pendingFlag, onToggleFlag }) {
  const isHidden = !blog.isPublished;
  return (
    <div className="flex items-center gap-1.5">
      {HIGHLIGHTS.map(({ flag, label, icon: Icon, on }) => {
        const isOn = Boolean(blog[flag]);
        const isPending = pendingFlag === `${blog._id}:${flag}`;
        let title = isOn ? `Remove from ${label}` : `Mark as ${label}`;
        if (isHidden && !isOn) title = `Publish the blog to mark it as ${label}`;
        return (
          <button
            key={flag}
            type="button"
            role="switch"
            aria-checked={isOn}
            aria-label={`${label}: ${blog.title}`}
            title={title}
            disabled={Boolean(pendingFlag) || (isHidden && !isOn)}
            onClick={() => onToggleFlag(blog, flag)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:cursor-not-allowed ${isHidden && !isOn ? 'opacity-50' : ''} ${
              isOn ? on : 'bg-white text-slate-400 ring-slate-200 hover:text-slate-600 hover:ring-slate-300'
            } ${pendingFlag && !isPending ? 'opacity-60' : ''}`}
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

function RowActions({ blog, onEdit, onToggleStatus, onDelete }) {
  const isHidden = !blog.isPublished;
  const ToggleIcon = isHidden ? PlayCircle : PauseCircle;
  return (
    <div className="flex items-center justify-end gap-1 shrink-0">
      <button
        type="button"
        onClick={() => onEdit(blog)}
        aria-label={`Edit ${blog.title}`}
        title="Edit"
        className="p-2 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
      >
        <PencilLine size={17} />
      </button>
      <button
        type="button"
        onClick={() => onToggleStatus(blog)}
        aria-label={`${isHidden ? 'Publish' : 'Hide'} ${blog.title}`}
        title={isHidden ? 'Publish' : 'Hide'}
        className={`p-2 rounded-lg text-slate-500 transition-colors focus:outline-none focus-visible:ring-2 ${
          isHidden
            ? 'hover:text-emerald-600 hover:bg-emerald-50 focus-visible:ring-emerald-500/50'
            : 'hover:text-amber-600 hover:bg-amber-50 focus-visible:ring-amber-500/50'
        }`}
      >
        <ToggleIcon size={17} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(blog)}
        aria-label={`Delete ${blog.title}`}
        title="Delete"
        className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
      >
        <Trash2 size={17} />
      </button>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-slate-100 animate-pulse" aria-label="Loading blogs">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex items-center gap-4 px-4 xl:px-6 py-4">
          <div className="w-16 h-12 rounded-xl bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-56 max-w-full rounded bg-slate-100" />
            <div className="h-3 w-28 max-w-full rounded bg-slate-100" />
          </div>
          <div className="hidden xl:block h-6 w-24 rounded-full bg-slate-100" />
          <div className="hidden sm:block h-6 w-20 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
