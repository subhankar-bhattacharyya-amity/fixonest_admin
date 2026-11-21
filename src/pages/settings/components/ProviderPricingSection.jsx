import { useState, useEffect, useCallback } from 'react';
import { IndianRupee, Layers, Loader2, Percent, CheckCircle2 } from 'lucide-react';
import { getJson } from '@/lib/httpClient.js';

export default function ProviderPricingSection() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPricing = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getJson('/provider/api/v1/provider-assignments/my-pricing');
      setData(res.data || []);
    } catch (err) {
      // Handled globally
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  return (
    <div className="space-y-6 animate-rise-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">My Category Rates & Commission</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review the vertical-wise platform commission and your net payout breakdown for your assigned categories.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="animate-spin mr-2" size={20} />
          <span>Loading your category rates...</span>
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center text-slate-500">
          <p className="font-semibold text-slate-700">No categories assigned yet.</p>
          <p className="text-xs text-slate-400 mt-1">Contact your vertical administrator to get assigned to service categories.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {data.map((catItem) => {
            const vertical = catItem.vertical || {};
            const commissionRate = vertical.commissionRate !== undefined ? vertical.commissionRate : 10;
            const providerRate = vertical.providerRate !== undefined ? vertical.providerRate : 90;

            return (
              <div
                key={catItem.category_id}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
              >
                <div className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                      <Layers size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-bold text-slate-800">{catItem.categoryName}</h2>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={11} /> Assigned
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Vertical: <strong className="text-slate-700">{vertical.displayName || vertical.name || 'General'}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                      <span className="text-slate-400 font-medium mr-1.5">Platform Fee:</span>
                      <strong className="text-teal-600 font-bold">{commissionRate}%</strong>
                    </div>
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                      <span className="text-slate-400 font-medium mr-1.5">Your Payout:</span>
                      <strong className="text-emerald-700 font-bold">{providerRate}%</strong>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  {catItem.services.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No active services found in this category.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="pb-3 pl-2">Service Name</th>
                            <th className="pb-3 text-right">Customer Price</th>
                            <th className="pb-3 text-right text-teal-600">Platform Fee ({commissionRate}%)</th>
                            <th className="pb-3 text-right text-emerald-700 pr-2">Your Payout ({providerRate}%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {catItem.services.map((srv) => (
                            <tr key={srv._id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 pl-2 font-medium text-slate-800">
                                <div>{srv.name}</div>
                                {srv.durationInMinutes && (
                                  <span className="text-[11px] text-slate-400">{srv.durationInMinutes} mins</span>
                                )}
                              </td>
                              <td className="py-3 text-right font-semibold text-slate-700">
                                ₹{srv.finalAmount}
                                {srv.discountPrice > 0 && srv.price > srv.discountPrice && (
                                  <span className="block text-[11px] text-slate-400 line-through">₹{srv.price}</span>
                                )}
                              </td>
                              <td className="py-3 text-right font-bold text-teal-600">
                                -₹{srv.commissionAmount}
                              </td>
                              <td className="py-3 text-right font-extrabold text-emerald-700 pr-2">
                                ₹{srv.providerAmount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

