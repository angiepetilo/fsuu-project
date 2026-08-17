import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/axios";
import {
  GraduationCap, Calendar, CheckCircle2, AlertTriangle,
  Archive, ArrowRight, ShieldCheck, Database, Loader2,
  RefreshCw, Lock, Sparkles, Building2, PackageOpen, AlertOctagon
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AcademicTermsTab() {
  const [loading, setLoading] = useState(true);
  const [activeTerm, setActiveTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Next term form state
  const [nextTerm, setNextTerm] = useState({
    academic_year: "2026-2027",
    semester: "2nd Semester",
    start_date: "2027-01-15",
    end_date: "2027-05-30",
    pin: "",
  });

  const fetchTerms = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/academic-terms");
      if (res.data) {
        setActiveTerm(res.data.active_term || null);
        setAllTerms(res.data.terms || []);
      }
    } catch (err) {
      console.error("Failed to load academic terms:", err);
      toast.error("Failed to fetch academic terms data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerms();
  }, []);

  const handleOpenCloseModal = () => {
    // Predict next semester logically
    if (activeTerm) {
      const is1st = activeTerm.semester.includes("1st");
      const is2nd = activeTerm.semester.includes("2nd");
      const currentYear = activeTerm.academic_year || "2026-2027";
      const [y1, y2] = currentYear.split("-").map(Number);

      if (is1st) {
        setNextTerm({
          academic_year: currentYear,
          semester: "2nd Semester",
          start_date: `${y1 + 1}-01-15`,
          end_date: `${y1 + 1}-05-30`,
          pin: "",
        });
      } else if (is2nd) {
        setNextTerm({
          academic_year: `${y1 + 1}-${y2 + 1}`,
          semester: "1st Semester",
          start_date: `${y1 + 1}-08-01`,
          end_date: `${y1 + 1}-12-20`,
          pin: "",
        });
      }
    }
    setIsModalOpen(true);
  };

  const handleCloseTermSubmit = async (e) => {
    e.preventDefault();
    if (!nextTerm.academic_year || !nextTerm.semester || !nextTerm.start_date || !nextTerm.end_date) {
      toast.error("Please fill in all required next term details.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/admin/academic-terms/close-term", nextTerm);
      toast.success(res.data.message || "Semester archived into TiDB successfully!");
      setIsModalOpen(false);
      fetchTerms();
      window.dispatchEvent(new Event("equipment_inventory_updated"));
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.pin?.[0] || "Failed to archive semester.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium">Loading Academic Term Records...</p>
      </div>
    );
  }

  const archivedTerms = allTerms.filter(t => !t.is_active);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 rounded-2xl text-white shadow-md">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider border border-blue-400/30">
            <Database className="w-3.5 h-3.5" />
            TiDB Cloud Archival & Lifecycle
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Academic Terms & Archiving</h2>
          <p className="text-blue-200 text-sm max-w-2xl">
            Control the university active semester lifecycle. When a term ends, archive all completed bookings, borrowing logs, and violations into TiDB while resetting the staff queues to a clean slate.
          </p>
        </div>
        <Button
          onClick={fetchTerms}
          variant="outline"
          className="self-start sm:self-center border-white/20 text-slate-800 bg-white hover:bg-slate-100 font-semibold shrink-0"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Sync Terms
        </Button>
      </div>

      {/* Current Active Semester Card */}
      {activeTerm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  CURRENT ACTIVE SEMESTER
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  AY {activeTerm.academic_year}
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-extrabold text-slate-900">
                  {activeTerm.name}
                </h3>
                <p className="text-sm font-medium text-slate-600 flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Official Period: <span className="font-semibold text-slate-900">{activeTerm.start_date}</span> to <span className="font-semibold text-slate-900">{activeTerm.end_date}</span>
                </p>
              </div>

              {/* Term Snapshot Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    Venue Bookings
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {activeTerm.venue_bookings_count ?? 0}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <PackageOpen className="w-3.5 h-3.5 text-indigo-600" />
                    Gear Borrowings
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {activeTerm.equipment_borrowings_count ?? 0}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <AlertOctagon className="w-3.5 h-3.5 text-amber-600" />
                    Breaches & Damages
                  </div>
                  <div className="text-xl font-bold text-amber-700 mt-1">
                    {activeTerm.breaches_count ?? 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Trigger Button */}
            <div className="flex flex-col gap-2 shrink-0 lg:max-w-xs">
              <Button
                onClick={handleOpenCloseModal}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <GraduationCap className="w-5 h-5" />
                Close Semester & Roll Over
              </Button>
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                Archives all active term records to TiDB and opens a fresh queue for the next semester.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TiDB Archive Vault Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Archive className="w-5 h-5 text-indigo-600" />
              TiDB Historical Semester Vault
            </h3>
            <p className="text-xs text-slate-500">
              Permanently archived academic semesters. All completed transactions and inspection logs remain 100% accessible.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {archivedTerms.length} Past Term{archivedTerms.length !== 1 ? "s" : ""}
          </span>
        </div>

        {archivedTerms.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Archive className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-semibold">No archived semesters yet.</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When you close the current academic term, its historical snapshot will be securely stored here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Academic Term</th>
                  <th className="px-5 py-3">Period</th>
                  <th className="px-5 py-3 text-center">Venues</th>
                  <th className="px-5 py-3 text-center">Equipments</th>
                  <th className="px-5 py-3 text-center">Breaches</th>
                  <th className="px-5 py-3">Archived By</th>
                  <th className="px-5 py-3">Archival Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {archivedTerms.map((term) => (
                  <tr key={term.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{term.name}</div>
                      <div className="text-xs text-slate-500">AY {term.academic_year} • {term.semester}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-slate-600">
                      {term.start_date} → {term.end_date}
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-slate-900">
                      {term.total_venue_bookings}
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-slate-900">
                      {term.total_equipment_borrowings}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${term.total_breaches > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {term.total_breaches}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {term.closed_by_user?.name || "Super Admin"}
                      <div className="text-[10px] text-slate-400">
                        {term.closed_at ? new Date(term.closed_at).toLocaleDateString() : "—"}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <Database className="w-3 h-3 text-blue-600" />
                        Archived in TiDB
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Close Term & Initialize Next Semester Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Close Semester & Initialize Next Term
                  </h3>
                  <p className="text-xs text-slate-500">
                    Seal current term records and launch the next academic period.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Impact Explanation Callout */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-blue-950">
                <Sparkles className="w-4 h-4 text-blue-600" />
                What will happen upon closing:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                <li>Current records for <strong>{activeTerm?.name}</strong> will be sealed into TiDB archive.</li>
                <li>Staff & Office Manager reservation queues will open with a <strong>fresh, clean slate (0 active rows)</strong>.</li>
                <li>All venue catalogs, registered equipment barcodes, and user accounts remain intact.</li>
              </ul>
            </div>

            {/* Form */}
            <form onSubmit={handleCloseTermSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Next Academic Year *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2026-2027"
                    value={nextTerm.academic_year}
                    onChange={(e) => setNextTerm({ ...nextTerm, academic_year: e.target.value })}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Next Semester *
                  </label>
                  <select
                    value={nextTerm.semester}
                    onChange={(e) => setNextTerm({ ...nextTerm, semester: e.target.value })}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-white font-medium"
                  >
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                    <option value="Summer Term">Summer Term</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={nextTerm.start_date}
                    onChange={(e) => setNextTerm({ ...nextTerm, start_date: e.target.value })}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={nextTerm.end_date}
                    onChange={(e) => setNextTerm({ ...nextTerm, end_date: e.target.value })}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Master Verification PIN */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  Master Security Verification PIN (if enabled)
                </label>
                <input
                  type="password"
                  placeholder="Enter 6-digit Master PIN..."
                  maxLength={6}
                  value={nextTerm.pin}
                  onChange={(e) => setNextTerm({ ...nextTerm, pin: e.target.value })}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 tracking-widest font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Archiving to TiDB...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 mr-2" />
                      Archive & Initialize Next Term
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
