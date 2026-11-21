import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { useAuth } from '@/features/auth/index.js';
import {
  useServices,
  fetchServiceById,
  fetchServiceCategoryOptions,
  fetchServiceSummary,
} from '@/features/service/index.js';
import { getServicesPath } from '@/routes/constants.js';
import { ServiceForm } from './components/index.js';

// "Service Management > Add Service / Edit Service", for the Super Admin and
// the Admin. One page for both: without a :serviceId it creates a service,
// with one it loads that service (details and gallery included) and edits it.
// The form itself is components/ServiceForm.jsx - this page only gathers what
// the form needs and shows a skeleton until the service is here.
export default function ServiceEditorPage() {
  const dispatch = useDispatch();
  const { serviceId } = useParams();
  const { role } = useAuth();
  const { categories, summary } = useServices();
  const isEdit = Boolean(serviceId);

  // The service being edited, with the id it was loaded for so a stale one is
  // never shown after navigating from one service to another.
  const [loaded, setLoaded] = useState({ id: null, service: null, failed: false });

  useEffect(() => {
    dispatch(fetchServiceCategoryOptions());
    dispatch(fetchServiceSummary());
  }, [dispatch]);

  useEffect(() => {
    if (!serviceId) return undefined;
    let cancelled = false;
    dispatch(fetchServiceById(serviceId))
      .unwrap()
      .then((response) => {
        if (!cancelled) setLoaded({ id: serviceId, service: response.data, failed: false });
      })
      .catch(() => {
        // The reason was already toasted globally by lib/httpClient.js.
        if (!cancelled) setLoaded({ id: serviceId, service: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch, serviceId]);

  const isCurrent = loaded.id === serviceId;

  if (isEdit && !isCurrent) return <EditorSkeleton />;
  if (isEdit && loaded.failed) return <NotFound listPath={getServicesPath(role)} />;

  return (
    <ServiceForm
      // A different service (or switching between edit and create) starts a fresh form.
      key={serviceId ?? 'new'}
      service={isEdit ? loaded.service : null}
      categories={categories.items}
      categoriesReady={categories.status === 'succeeded' || categories.status === 'failed'}
      role={role}
      summary={summary.status === 'succeeded' ? summary.data : null}
    />
  );
}

function EditorSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading service">
      <div className="space-y-2">
        <div className="h-3 w-28 rounded bg-slate-200" />
        <div className="h-7 w-44 rounded bg-slate-200" />
        <div className="h-3.5 w-72 max-w-full rounded bg-slate-200" />
      </div>
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4].map((pill) => (
          <div key={pill} className="h-8 w-24 rounded-full bg-slate-200" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-6">
          {[0, 1].map((card) => (
            <div key={card} className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 space-y-4">
              <div className="h-10 w-48 rounded-lg bg-slate-100" />
              <div className="h-11 rounded-lg bg-slate-100" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-11 rounded-lg bg-slate-100" />
                <div className="h-11 rounded-lg bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <div className="h-36 bg-white rounded-2xl border border-slate-100" />
          <div className="h-80 bg-white rounded-2xl border border-slate-100" />
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
      <h1 className="text-lg font-bold text-slate-800">This service couldn't be opened</h1>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">It may have been deleted, or the link is no longer valid.</p>
      <Link
        to={listPath}
        className="mt-6 px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
      >
        <ArrowLeft size={18} />
        Back to services
      </Link>
    </div>
  );
}
