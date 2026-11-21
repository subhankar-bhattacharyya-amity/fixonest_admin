import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Percent, Layers, Edit3, Loader2, Check, ArrowRight } from 'lucide-react';
import { getJson, patchJson } from '@/lib/httpClient.js';
import { Modal } from '@/components/common/modal/index.js';

export default function VerticalCommissionSection({ id = 'vertical-commission-section' }) {
  const [verticals, setVerticals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingVertical, setEditingVertical] = useState(null);
  const [rateInput, setRateInput] = useState(10);
  const [saving, setSaving] = useState(false);

  const loadVerticals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getJson('/super-admin/api/v1/verticals?per_page=100');
      setVerticals(res.data || []);
    } catch (err) {
      // Handled globally by httpClient
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVerticals();
  }, [loadVerticals]);

  const handleOpenEdit = (vertical) => {
    setEditingVertical(vertical);
    setRateInput(vertical.commissionRate !== undefined ? vertical.commissionRate : 10);
  };

  const handleCloseEdit = () => {
    if (saving) return;
    setEditingVertical(null);
  };

  const handleSaveCommission = async (e) => {
    e.preventDefault();
    if (!editingVertical) return;
    const num = Number(rateInput);
    if (isNaN(num) || num < 0 || num > 100) {
      toast.error('Commission rate must be between 0% and 100%');
      return;
    }

    try {
      setSaving(true);
      await patchJson(`/super-admin/api/v1/verticals/${editingVertical._id}/commission`, {
        commissionRate: num,
      });
      toast.success(`Commission rate updated to ${num}% for ${editingVertical.display_name || editingVertical.name}`);
      setVerticals((prev) =>
        prev.map((v) => (v._id === editingVertical._id ? { ...v, commissionRate: num } : v))
      );
      setEditingVertical(null);
    } catch (err) {
      // Handled globally
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id={id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Percent size={20} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800">Vertical Commission Rates</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Platform percentage fee charged on bookings under each service vertical
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="animate-spin mr-2" size={20} />
            <span>Loading vertical commission rates...</span>
          </div>
        ) : verticals.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">No service verticals found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {verticals.map((vert) => {
              const commission = vert.commissionRate !== undefined ? vert.commissionRate : 10;
              const providerShare = Math.round((100 - commission) * 100) / 100;
              return (
                <div
                  key={vert._id}
                  className="rounded-xl border border-slate-200/80 p-5 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-100/60 text-teal-700 flex items-center justify-center font-bold text-xs">
                          <Layers size={16} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm">
                            {vert.display_name || vert.name}
                          </h3>
                          <span className="text-xs text-slate-400 font-mono">{vert.name}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(vert)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors border border-teal-200/60"
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-lg border border-slate-100">
                        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                          Fixonest Fee
                        </span>
                        <span className="text-lg font-extrabold text-teal-600 mt-0.5 block">
                          {commission}%
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-100">
                        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                          Provider Payout
                        </span>
                        <span className="text-lg font-extrabold text-slate-700 mt-0.5 block">
                          {providerShare}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span>Example on ₹1,000 booking:</span>
                    <span className="font-semibold text-slate-600">₹{Math.round(1000 * (commission / 100))} fee</span>
                    <span>·</span>
                    <span className="font-semibold text-slate-600">₹{Math.round(1000 * (providerShare / 100))} pro</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingVertical && (
        <Modal
          title={`Edit Commission: ${editingVertical.display_name || editingVertical.name}`}
          description="Adjust the percentage fee Fixonest charges for bookings in this vertical."
          icon={Percent}
          busy={saving}
          onClose={handleCloseEdit}
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <button
                type="button"
                onClick={handleCloseEdit}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCommission}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                <span>Save Rate</span>
              </button>
            </div>
          }
        >
          <form onSubmit={handleSaveCommission} className="space-y-4">
            <div>
              <label htmlFor="commissionRateInput" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Platform Commission Percentage (%)
              </label>
              <div className="relative">
                <input
                  id="commissionRateInput"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  disabled={saving}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-slate-800 font-semibold"
                  placeholder="e.g. 10"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Fixonest Platform Share:</span>
                <span className="font-bold text-teal-700">{Number(rateInput) || 0}%</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Service Professional Payout:</span>
                <span className="font-bold text-slate-800">{Math.max(0, 100 - (Number(rateInput) || 0))}%</span>
              </div>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between font-medium text-slate-500">
                <span>On a ₹500 booking:</span>
                <span>
                  Fee: <strong className="text-teal-700">₹{Math.round(500 * ((Number(rateInput) || 0) / 100))}</strong> | Payout: <strong className="text-slate-800">₹{Math.round(500 * (Math.max(0, 100 - (Number(rateInput) || 0)) / 100))}</strong>
                </span>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

