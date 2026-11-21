import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { useAuth } from '@/features/auth/index.js';
import { useBlogs, fetchBlogById, fetchBlogCategoryOptions, fetchBlogSummary } from '@/features/blog/index.js';
import { getBlogsPath } from '@/routes/constants.js';
import { BlogForm } from './components/index.js';

// "Blog Management > Write Blog / Edit Blog", for the Super Admin and the
// Admin. One page for both: without a :blogId it writes a new blog, with one
// it loads that blog and edits it. The form itself is components/BlogForm.jsx -
// this page only gathers what the form needs (the blog, the categories and the
// highlight counts) and shows a skeleton until the blog is here.
export default function BlogEditorPage() {
  const dispatch = useDispatch();
  const { blogId } = useParams();
  const { role, user } = useAuth();
  const { categories, summary } = useBlogs();
  const isEdit = Boolean(blogId);

  // The blog being edited, with the id it was loaded for so a stale one is
  // never shown after navigating from one blog to another.
  const [loaded, setLoaded] = useState({ id: null, blog: null, failed: false });

  useEffect(() => {
    dispatch(fetchBlogCategoryOptions());
    dispatch(fetchBlogSummary());
  }, [dispatch]);

  useEffect(() => {
    if (!blogId) return undefined;
    let cancelled = false;
    dispatch(fetchBlogById(blogId))
      .unwrap()
      .then((response) => {
        if (!cancelled) setLoaded({ id: blogId, blog: response.data, failed: false });
      })
      .catch(() => {
        // The reason was already toasted globally by lib/httpClient.js.
        if (!cancelled) setLoaded({ id: blogId, blog: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch, blogId]);

  const isCurrent = loaded.id === blogId;

  if (isEdit && !isCurrent) return <EditorSkeleton />;
  if (isEdit && loaded.failed) return <NotFound listPath={getBlogsPath(role)} />;

  return (
    <BlogForm
      // A different blog (or switching between edit and write) starts a fresh form.
      key={blogId ?? 'new'}
      blog={isEdit ? loaded.blog : null}
      categories={categories.items}
      categoriesReady={categories.status === 'succeeded' || categories.status === 'failed'}
      role={role}
      authorName={user?.fullName}
      summary={summary.status === 'succeeded' ? summary.data : null}
    />
  );
}

function EditorSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading blog">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-slate-200" />
        <div className="h-7 w-40 rounded bg-slate-200" />
        <div className="h-3.5 w-64 max-w-full rounded bg-slate-200" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 space-y-4">
          <div className="h-11 rounded-lg bg-slate-100" />
          <div className="h-10 rounded-lg bg-slate-100" />
          <div className="h-80 rounded-xl bg-slate-100" />
        </div>
        <div className="space-y-6">
          <div className="h-48 bg-white rounded-2xl border border-slate-100" />
          <div className="h-64 bg-white rounded-2xl border border-slate-100" />
        </div>
      </div>
    </div>
  );
}

function NotFound({ listPath }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center px-6 py-16 animate-rise-in">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
        <FileQuestion size={24} />
      </div>
      <h1 className="text-lg font-bold text-slate-800">This blog couldn't be opened</h1>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">It may have been deleted, or the link is no longer valid.</p>
      <Link
        to={listPath}
        className="mt-6 px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
      >
        <ArrowLeft size={18} />
        Back to blogs
      </Link>
    </div>
  );
}
