import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock3, ImageOff, MessageSquareText, PencilLine, Sparkles, Star, Wrench } from 'lucide-react';
import { useAuth } from '@/features/auth/index.js';
import { getServiceReviewsPath } from '@/routes/constants.js';
import { Modal } from '@/components/common/modal/index.js';
import { buildServiceImageUrl, fetchServiceById, formatServiceDuration } from '@/features/service/index.js';
import { ServiceCategoryChip, ServicePriceTag, ServiceRating, ServiceStatusPill } from './ServiceBadges.jsx';

// Read-only look at one service - roughly what its customer-site details page
// shows: the gallery, prices, details lists and skills. The listing row has no
// details or gallery, so the full service is loaded when the dialog opens;
// the row is shown meanwhile.
export default function ServiceDetailsModal({ service: row, onClose, onEdit }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [loaded, setLoaded] = useState(null);
  const [failed, setFailed] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    dispatch(fetchServiceById(row._id))
      .unwrap()
      .then((response) => !cancelled && setLoaded(response.data))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [dispatch, row._id]);

  const service = loaded ?? row;
  const details = loaded?.details;
  const images = [service.image_url, ...(loaded?.images ?? []).map((image) => image.image_url)]
    .filter(Boolean)
    .map(buildServiceImageUrl);
  const shownImage = images[Math.min(activeImage, images.length - 1)];
  const duration = details?.durationLabel || formatServiceDuration(service.durationInMinutes);
  const isLoading = !loaded && !failed;

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors"
      >
        Close
      </button>
      <button
        type="button"
        onClick={() => navigate(`${getServiceReviewsPath(role)}?service=${service._id}`)}
        className="px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
      >
        <MessageSquareText size={17} />
        Reviews
      </button>
      <button
        type="button"
        onClick={() => onEdit(service)}
        className="btn-primary px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/30"
      >
        <PencilLine size={17} />
        Edit Service
      </button>
    </>
  );

  return (
    <Modal title={service.name} description={service.description} icon={Wrench} size="lg" onClose={onClose} footer={footer}>
      <div className="space-y-6">
        {/* Gallery */}
        <div>
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-linear-to-br from-slate-50 to-teal-50/60 ring-1 ring-slate-100">
            {shownImage ? (
              <img src={shownImage} alt="" className="h-full w-full object-cover animate-rise-in" key={shownImage} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                <ImageOff size={26} />
                <span className="text-xs font-medium">No images yet</span>
              </div>
            )}
            {service.isFeatured && (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                <Star size={12} className="fill-white" />
                Featured
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`Show image ${index + 1}`}
                  className={`h-14 w-20 shrink-0 overflow-hidden rounded-xl ring-2 transition-all ${
                    index === activeImage ? 'ring-teal-500' : 'ring-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Key facts */}
        <div className="flex flex-wrap items-center gap-2">
          <ServiceStatusPill status={service.status} />
          <ServiceCategoryChip name={service.category_data?.name} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Fact label="Price">
            <ServicePriceTag price={service.price} discountPrice={service.discountPrice} size="lg" />
          </Fact>
          <Fact label="Rating">
            <ServiceRating rating={service.rating} reviewCount={service.reviewCount} className="text-sm" />
          </Fact>
          <Fact label="Duration">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Clock3 size={15} className="text-teal-600" />
              {duration || <span className="font-normal text-slate-400">Not set</span>}
            </span>
          </Fact>
        </div>

        {/* Details */}
        {isLoading ? (
          <div className="space-y-3 animate-pulse" aria-label="Loading details">
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-5/6 rounded bg-slate-100" />
            <div className="h-3 w-2/3 rounded bg-slate-100" />
          </div>
        ) : details ? (
          <div className="space-y-5">
            {details.overview && (
              <Section title="Service details">
                <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">{details.overview}</p>
              </Section>
            )}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <CheckList title="What you'll get" items={details.whatYouGet} />
              <CheckList title="Premium package benefits" items={details.packageBenefits} />
            </div>
            {details.skills?.length > 0 && (
              <Section title="Skills and services">
                <div className="flex flex-wrap gap-1.5">
                  {details.skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {skill}
                    </span>
                  ))}
                </div>
              </Section>
            )}
            {!details.overview && !details.whatYouGet?.length && !details.packageBenefits?.length && !details.skills?.length && (
              <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                <Sparkles size={14} className="text-teal-600" />
                No details page content yet - edit the service to add it.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function Fact({ label, children }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-bold text-slate-800">{title}</h3>
      {children}
    </section>
  );
}

function CheckList({ title, items = [] }) {
  if (!items.length) return null;
  return (
    <Section title={title}>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
            {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}
