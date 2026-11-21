import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  Printer,
  X,
  FileText,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Building2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import httpClient from '@/lib/httpClient.js';
import { ROLES } from '@/features/auth/index.js';

export default function InvoiceModal({
  isOpen,
  onClose,
  bookingId,
  bookingNumber,
  role = 'provider',
}) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  const getInvoiceBasePath = () => {
    if (role === ROLES.SUPER_ADMIN || role === 'super_admin') {
      return '/super-admin/api/v1/invoices';
    }
    if (role === ROLES.ADMIN || role === 'admin') {
      return '/admin/api/v1/invoices';
    }
    return '/provider/api/v1/invoices';
  };

  useEffect(() => {
    if (!isOpen || !bookingId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchInvoice = async () => {
      try {
        const basePath = getInvoiceBasePath();
        const response = await httpClient.get(`${basePath}/booking/${bookingId}`);
        if (isMounted) {
          setInvoice(response.data?.data || response.data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load invoice:', err);
          setError(err.response?.data?.message || 'Invoice is not ready or booking is not completed.');
          setLoading(false);
        }
      }
    };

    fetchInvoice();

    return () => {
      isMounted = false;
    };
  }, [isOpen, bookingId, role]);

  const handleDownloadPdf = async () => {
    if (!bookingId) return;
    try {
      setDownloading(true);
      const basePath = getInvoiceBasePath();
      const response = await httpClient.get(`${basePath}/booking/${bookingId}/pdf?download=true`, {
        responseType: 'blob',
      });

      // Handle JSON error body wrapped in blob
      if (response.data && response.data.type === 'application/json') {
        const text = await response.data.text();
        const errJson = JSON.parse(text);
        throw new Error(errJson.message || 'Failed to download invoice PDF');
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const filename = invoice?.invoiceNumber ? `${invoice.invoiceNumber}.pdf` : `invoice-${bookingNumber || bookingId}.pdf`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
      }, 5000);
      toast.success('Invoice PDF downloaded successfully');
    } catch (err) {
      console.error('Download invoice failed:', err);
      toast.error(err.message || 'Failed to download invoice PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-overlay-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl my-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                Official Tax Invoice
                {invoice?.invoiceNumber && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono font-medium">
                    #{invoice.invoiceNumber}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">Fixonest Home & Repair Services Pvt. Ltd.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !!error}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition disabled:opacity-50"
              title="Print Invoice"
            >
              <Printer size={14} />
              Print
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={loading || downloading || !!error}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-500 transition shadow-sm disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download size={14} />
                  Download PDF
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-10 h-10 text-teal-600 animate-spin mb-3" />
              <p className="text-sm font-medium text-slate-600">Generating corporate tax invoice...</p>
              <p className="text-xs text-slate-400 mt-1">Snapshotting customer, provider and verified payment details</p>
            </div>
          ) : error ? (
            <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800">Invoice Unavailable</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md">{error}</p>
            </div>
          ) : invoice ? (
            <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
              {/* Invoice Paper Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-2xl tracking-tight text-slate-900">
                      FIXO<span className="text-teal-600">NEST</span>
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      Tax Invoice
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {invoice.company?.name && !invoice.company.name.toLowerCase().includes('technologies')
                      ? invoice.company.name
                      : 'Fixonest Home & Repair Services Pvt. Ltd.'}
                  </p>
                  <p className="text-xs text-slate-500">{invoice.company?.address || 'Salt Lake Sector V, Bidhannagar, Kolkata, West Bengal 700091'}</p>
                  <p className="text-xs text-slate-500">GSTIN: {invoice.company?.gstin || '19AAACF1234M1Z5'} | CIN: {invoice.company?.cin || 'U93000WB2026PTC123456'}</p>
                </div>

                <div className="sm:text-right space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                    <CheckCircle2 size={13} />
                    PAID
                  </div>
                  <p className="text-xs text-slate-500 pt-1">
                    <span className="font-medium text-slate-700">Invoice No: </span>
                    <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">Booking No: </span>
                    <span className="font-mono text-slate-800">#{invoice.bookingNumber}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">Date: </span>
                    {new Date(invoice.issueDate || invoice.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Billed To & Provider Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-slate-100 text-xs">
                {/* Customer */}
                <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl">
                  <p className="font-bold text-[11px] uppercase tracking-wider text-slate-400">Billed To (Customer)</p>
                  <p className="font-semibold text-slate-900 text-sm">{invoice.customer?.name}</p>
                  <p className="text-slate-600 flex items-center gap-1.5">
                    <Phone size={12} className="text-slate-400" />
                    {invoice.customer?.phone}
                  </p>
                  {invoice.customer?.email && (
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <Mail size={12} className="text-slate-400" />
                      {invoice.customer?.email}
                    </p>
                  )}
                  {invoice.customer?.address && (
                    <p className="text-slate-600 flex items-start gap-1.5 pt-0.5">
                      <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        {invoice.customer.address.street}, {invoice.customer.address.city} {invoice.customer.address.postalCode}
                      </span>
                    </p>
                  )}
                </div>

                {/* Service Provider */}
                <div className="space-y-1.5 bg-teal-50/50 p-4 rounded-xl border border-teal-100/50">
                  <p className="font-bold text-[11px] uppercase tracking-wider text-teal-700">Service Partner</p>
                  <p className="font-semibold text-slate-900 text-sm">{invoice.provider?.name}</p>
                  {invoice.provider?.category && (
                    <p className="text-slate-600">Category: <span className="font-medium text-slate-800">{invoice.provider.category}</span></p>
                  )}
                  <p className="text-slate-600 flex items-center gap-1.5">
                    <Phone size={12} className="text-slate-400" />
                    {invoice.provider?.phone || 'Verified Partner'}
                  </p>
                  <p className="text-slate-600 flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400" />
                    Slot: {invoice.service?.timeSlot || 'Confirmed slot'}
                  </p>
                </div>
              </div>

              {/* Service Line Items */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 font-semibold w-1/2">Service Description</th>
                      <th className="py-2.5 font-semibold text-center w-1/6 whitespace-nowrap">Duration / Qty</th>
                      <th className="py-2.5 font-semibold text-right w-1/6 whitespace-nowrap">Rate</th>
                      <th className="py-2.5 font-semibold text-right w-1/6 whitespace-nowrap pr-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(invoice.items && invoice.items.length > 0) ? (
                      invoice.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-3 pr-4">
                            <p className="font-semibold text-slate-800 text-sm">{item.description}</p>
                            {invoice.service?.categoryName && (
                              <p className="text-[11px] text-slate-400">{invoice.service.categoryName}</p>
                            )}
                          </td>
                          <td className="py-3 text-center text-slate-600 whitespace-nowrap">
                            {item.quantity} {item.quantity === 1 ? 'Job' : 'Jobs'} ({invoice.service?.durationMinutes || 60} min)
                          </td>
                          <td className="py-3 text-right text-slate-600 font-medium whitespace-nowrap">₹{item.unitPrice}</td>
                          <td className="py-3 text-right font-bold text-slate-900 whitespace-nowrap pr-2">₹{item.total ?? item.amount ?? (item.unitPrice * (item.quantity || 1))}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-3 pr-4">
                          <p className="font-semibold text-slate-800 text-sm">{invoice.service?.title || 'Professional Home Service'}</p>
                          <p className="text-[11px] text-slate-400">{invoice.service?.categoryName}</p>
                        </td>
                        <td className="py-3 text-center text-slate-600 whitespace-nowrap">1 Job ({invoice.service?.durationMinutes || 60} min)</td>
                        <td className="py-3 text-right text-slate-600 font-medium whitespace-nowrap">₹{invoice.subtotal}</td>
                        <td className="py-3 text-right font-bold text-slate-900 whitespace-nowrap pr-2">₹{invoice.subtotal}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between gap-6">
                <div className="text-xs text-slate-500 space-y-1.5 sm:max-w-xs">
                  <p className="font-semibold text-slate-700">Payment Information:</p>
                  <p>Mode: <span className="font-medium text-slate-800 capitalize">{invoice.paymentMethod?.replace(/_/g, ' ') || 'Cash on Delivery'}</span></p>
                  <p>Status: <span className="font-medium text-emerald-600 capitalize">{invoice.paymentStatus}</span></p>
                  <p>Amount Paid: <span className="font-bold text-slate-900">₹{invoice.paidAmount}</span></p>
                </div>

                <div className="w-full sm:w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-medium text-slate-800">₹{invoice.subtotal}</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount Applied:</span>
                      <span className="font-medium">-₹{invoice.discount}</span>
                    </div>
                  )}
                  {invoice.taxAmount > 0 ? (
                    <div className="flex justify-between text-slate-600">
                      <span>GST / Tax ({invoice.taxRate}%):</span>
                      <span className="font-medium text-slate-800">₹{invoice.taxAmount}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-slate-400">
                      <span>Taxes & Fees:</span>
                      <span>Included</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-slate-900">
                    <span>Total Amount Paid:</span>
                    <span>₹{invoice.totalAmount}</span>
                  </div>

                  {/* Provider & Commission Split Banner */}
                  {(role === 'provider' || role === ROLES.PROVIDER) ? (
                    <div className="mt-3 p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Platform Fee ({invoice.commissionRate}%):</span>
                        <span>-₹{invoice.commissionAmount}</span>
                      </div>
                      <div className="flex justify-between font-bold text-xs pt-1 border-t border-teal-200/60 text-teal-800">
                        <span>Your Net Earnings:</span>
                        <span>₹{invoice.providerAmount}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span>Fixonest Commission ({invoice.commissionRate}%):</span>
                        <span className="font-bold text-teal-700">₹{invoice.commissionAmount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Provider Earnings:</span>
                        <span className="font-bold text-slate-800">₹{invoice.providerAmount}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Guarantee & Terms Footer */}
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-end gap-4 text-[11px] text-slate-400">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-600">Fixonest Service Assurance:</p>
                  <p>1. Service covered under 30-day quality guarantee.</p>
                  <p>2. Computer-generated tax invoice, requires no physical signature.</p>
                </div>
                <div className="text-center sm:text-right border border-dashed border-slate-200 p-2.5 rounded-lg">
                  <p className="font-bold text-slate-800">For Fixonest Home & Repair Services Pvt. Ltd.</p>
                  <p className="text-[10px] text-teal-600 font-semibold mt-1">Authorized Digital Signatory</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
