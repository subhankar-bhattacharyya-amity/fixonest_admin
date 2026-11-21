import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { ChevronDown, Eye, EyeOff, Globe, Lightbulb, Loader2, PencilLine, Plus, Save } from 'lucide-react';
import {
  FAQ_STATUS,
  FAQ_QUESTION_MAX,
  FAQ_ANSWER_MAX,
  faqValidationSchema,
  createFaq,
  updateFaq,
} from '@/features/faq/index.js';
import { Modal } from '@/components/common/modal/index.js';

const fieldClass = (hasError) =>
  `input-field bg-slate-50 ${hasError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/40' : ''}`;

// One modal for "Add FAQ" (no `faq`) and "Edit FAQ", for the section of the
// tab it was opened from. A new FAQ goes to the end of the section
// (`nextOrder`); its position is changed afterwards with the listing's arrows.
// Edit pre-fills from the listing row and sends only what actually changed.
export default function FaqFormModal({ faq = null, section, nextOrder, onClose, onSaved }) {
  const dispatch = useDispatch();
  const isEdit = Boolean(faq);
  const [previewOpen, setPreviewOpen] = useState(true);

  const defaultValues = useMemo(
    () => ({
      question: faq?.question ?? '',
      answer: faq?.answer ?? '',
      isActive: faq ? faq.status !== FAQ_STATUS.INACTIVE : true,
    }),
    [faq],
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(faqValidationSchema), defaultValues });

  const [question = '', answer = '', isActive] = useWatch({ control, name: ['question', 'answer', 'isActive'] });

  const onSubmit = async (values) => {
    const status = values.isActive ? FAQ_STATUS.ACTIVE : FAQ_STATUS.INACTIVE;
    try {
      let result;
      if (isEdit) {
        const changes = {};
        if (values.question !== defaultValues.question) changes.question = values.question;
        if (values.answer !== defaultValues.answer) changes.answer = values.answer;
        if (values.isActive !== defaultValues.isActive) changes.status = status;
        result = await dispatch(updateFaq({ id: faq._id, payload: changes })).unwrap();
      } else {
        result = await dispatch(
          createFaq({
            question: values.question,
            answer: values.answer,
            category: section.category,
            order: nextOrder,
            status,
          }),
        ).unwrap();
      }
      toast.success(result.message);
      onSaved();
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit FAQ' : 'Add FAQ'}
      description={
        isEdit ? `Update this question on the ${section.label}.` : `Add a question to the ${section.label}'s FAQ section.`
      }
      icon={isEdit ? PencilLine : Plus}
      size="lg"
      busy={isSubmitting}
      onClose={onClose}
      footer={
        <>
          {isEdit && !isDirty && (
            <span className="sm:mr-auto self-center text-xs text-slate-400 text-center sm:text-left">
              Change a field to enable saving
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="faq-form"
            disabled={isSubmitting || (isEdit && !isDirty)}
            className="btn-primary px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/30 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : isEdit ? <Save size={18} /> : <Plus size={18} />}
            {isEdit ? 'Save Changes' : 'Add FAQ'}
          </button>
        </>
      }
    >
      <form id="faq-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <fieldset className="space-y-4">
          <legend className="mb-3 flex w-full items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Question &amp; answer
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold normal-case tracking-normal text-teal-700">
              <section.icon size={12} />
              {section.label}
            </span>
          </legend>

          {/* Question */}
          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="faq-question" className="text-sm font-medium text-gray-700">
                Question <span className="text-rose-500">*</span>
              </label>
              <CharCount value={question} max={FAQ_QUESTION_MAX} />
            </div>
            <textarea
              id="faq-question"
              rows={2}
              autoFocus={!isEdit}
              placeholder="e.g. How do I book a service on Fixonest?"
              aria-invalid={Boolean(errors.question)}
              className={`${fieldClass(errors.question)} resize-none font-medium`}
              {...register('question')}
            />
            {errors.question ? (
              <p role="alert" className="text-xs font-medium text-rose-500">
                {errors.question.message}
              </p>
            ) : (
              <p className="text-xs text-slate-400">Write it the way a customer would ask it.</p>
            )}
          </div>

          {/* Answer */}
          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="faq-answer" className="text-sm font-medium text-gray-700">
                Answer <span className="text-rose-500">*</span>
              </label>
              <CharCount value={answer} max={FAQ_ANSWER_MAX} />
            </div>
            <textarea
              id="faq-answer"
              rows={5}
              placeholder="A clear, friendly answer in a few sentences."
              aria-invalid={Boolean(errors.answer)}
              className={`${fieldClass(errors.answer)} resize-y min-h-28 leading-relaxed`}
              {...register('answer')}
            />
            {errors.answer ? (
              <p role="alert" className="text-xs font-medium text-rose-500">
                {errors.answer.message}
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <Lightbulb size={12} className="shrink-0 text-amber-400" />
                Two or three sentences read best in the website's accordion.
              </p>
            )}
          </div>

          {/* Visibility */}
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <button
                type="button"
                role="switch"
                aria-checked={field.value}
                onClick={() => field.onChange(!field.value)}
                disabled={isSubmitting}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left ring-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:opacity-60 ${
                  field.value ? 'bg-emerald-50/60 ring-emerald-100' : 'bg-slate-50 ring-slate-200'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    field.value ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'
                  }`}
                  aria-hidden="true"
                >
                  {field.value ? <Eye size={17} /> : <EyeOff size={17} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-700">
                    {field.value ? 'Live on the website' : 'Hidden from the website'}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {field.value
                      ? 'Customers see this question as soon as you save.'
                      : 'Saved here as a draft. Customers won’t see it until you turn this on.'}
                  </span>
                </span>
                <span
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${field.value ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  aria-hidden="true"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      field.value ? 'translate-x-5' : ''
                    }`}
                  />
                </span>
              </button>
            )}
          />
        </fieldset>

        {/* Live preview - styled like the customer site's FAQ accordion */}
        <div className="rounded-2xl border border-slate-100 bg-linear-to-br from-slate-50 to-teal-50/40 p-3.5 sm:p-4">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <Globe size={12} />
            Website preview
            {!isActive && <span className="ml-auto normal-case tracking-normal font-medium text-slate-400">Hidden</span>}
          </p>
          <div className={`rounded-xl bg-white shadow-sm ring-1 ring-slate-100 transition-opacity ${isActive ? '' : 'opacity-60'}`}>
            <button
              type="button"
              onClick={() => setPreviewOpen((open) => !open)}
              aria-expanded={previewOpen}
              className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
            >
              <span className={`text-sm font-semibold ${question.trim() ? 'text-slate-900' : 'text-slate-400'}`}>
                {question.trim() || 'Your question appears here'}
              </span>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-200 ${
                  previewOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              >
                <ChevronDown size={14} />
              </span>
            </button>
            <div className={`grid transition-all duration-300 ${previewOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
                <p
                  className={`px-4 pb-4 text-sm leading-relaxed whitespace-pre-line ${
                    answer.trim() ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  {answer.trim() || 'And the answer shows up here when a customer opens the question.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function CharCount({ value, max }) {
  const length = value.length;
  const tone = length > max ? 'font-semibold text-rose-500' : length > max * 0.9 ? 'text-amber-500' : 'text-slate-400';
  return (
    <span className={`text-[11px] tabular-nums ${tone}`}>
      {length}/{max}
    </span>
  );
}
