import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Loader2, CheckCircle2, Archive, RefreshCw } from "lucide-react";
import api from "@/lib/axios";

export default function AcademicTermsTab({ showMsg }) {
  const [terms, setTerms] = useState([]);
  const [activeTerm, setActiveTerm] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [editTerm, setEditTerm] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form states
  const [termForm, setTermForm] = useState({
    academic_year: "2026-2027",
    semester: "1st Semester",
    start_date: "2026-08-01",
    end_date: "2026-12-20",
    is_active: false,
  });

  const [closeForm, setCloseForm] = useState({
    academic_year: "2026-2027",
    semester: "2nd Semester",
    start_date: "2027-01-15",
    end_date: "2027-05-30",
    pin: "",
  });

  const notify = (msg) => {
    if (typeof showMsg === "function") {
      showMsg(msg);
    }
  };

  const fetchTerms = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/academic-terms");
      if (res.data) {
        setTerms(res.data.terms || []);
        setActiveTerm(res.data.active_term || null);
      }
    } catch (err) {
      console.error("Failed to load academic terms:", err);
      notify("❌ Failed to load academic terms data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerms();
  }, []);

  const handleOpenAdd = () => {
    setEditTerm(null);
    setTermForm({
      academic_year: "2026-2027",
      semester: "1st Semester",
      start_date: "",
      end_date: "",
      is_active: terms.length === 0,
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (term) => {
    setEditTerm(term);
    setTermForm({
      academic_year: term.academic_year || "2026-2027",
      semester: term.semester || "1st Semester",
      start_date: term.start_date || "",
      end_date: term.end_date || "",
      is_active: term.is_active || false,
    });
    setShowAddModal(true);
  };

  const handleSaveTerm = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    const label = `${termForm.semester} AY ${termForm.academic_year}`;

    if (editTerm) {
      // ── OPTIMISTIC EDIT ─────────────────────────────────────────────────
      const prev = terms;
      setTerms(t => t.map(x => x.id === editTerm.id ? { ...x, ...termForm, name: label, _optimistic: true } : x));
      setShowAddModal(false); setEditTerm(null);
      try {
        await api.put(`/admin/academic-terms/${editTerm.id}`, termForm);
        setTerms(t => t.map(x => x.id === editTerm.id ? { ...x, _optimistic: false } : x));
        notify(`Academic term "${label}" updated!`);
      } catch (err) {
        setTerms(prev); setEditTerm(editTerm); setShowAddModal(true);
        notify(err.response?.data?.message || `Failed to update — reverted.`);
      } finally { setFormLoading(false); }
    } else {
      // ── OPTIMISTIC ADD ──────────────────────────────────────────────────
      const tempId = `temp-${Date.now()}`;
      const prev = terms;
      setTerms(t => [...t, { ...termForm, id: tempId, name: label, _optimistic: true }]);
      setShowAddModal(false);
      try {
        const res = await api.post("/admin/academic-terms", termForm);
        const saved = res.data;
        setTerms(t => t.map(x => x.id === tempId ? { ...saved, _optimistic: false } : x));
        notify(`Academic term "${label}" created!`);
      } catch (err) {
        setTerms(prev); setShowAddModal(true);
        notify(err.response?.data?.message || `Failed to create — reverted.`);
      } finally { setFormLoading(false); }
    }
  };

  const handleActivateTerm = async (term) => {
    if (!confirm(`Set "${term.name}" as the active academic semester?`)) return;
    // ── OPTIMISTIC ACTIVATE ────────────────────────────────────────────────
    const prev = terms;
    const prevActive = activeTerm;
    setTerms(t => t.map(x => ({ ...x, is_active: x.id === term.id })));
    setActiveTerm(term);
    try {
      await api.post(`/admin/academic-terms/${term.id}/activate`);
      notify(`"${term.name}" is now the ACTIVE academic semester.`);
      fetchTerms(); // refresh for accurate server data
    } catch (err) {
      setTerms(prev); setActiveTerm(prevActive);
      notify(err.response?.data?.message || "Failed to activate — reverted.");
    }
  };

  const handleDeleteTerm = async (term) => {
    if (term.is_active) { notify("Cannot delete the currently active semester."); return; }
    if (!confirm(`Delete "${term.name}"?`)) return;
    // ── OPTIMISTIC DELETE ────────────────────────────────────────────────
    const prev = terms;
    setTerms(t => t.filter(x => x.id !== term.id));
    try {
      await api.delete(`/admin/academic-terms/${term.id}`);
      notify(`Academic term "${term.name}" deleted.`);
    } catch (err) {
      setTerms(prev);
      notify(err.response?.data?.message || "Failed to delete — reverted.");
    }
  };

  const handleOpenCloseModal = () => {
    if (activeTerm) {
      const is1st = activeTerm.semester?.includes("1st");
      const currentYear = activeTerm.academic_year || "2026-2027";
      const [y1, y2] = currentYear.split("-").map(Number);

      if (is1st) {
        setCloseForm({
          academic_year: currentYear,
          semester: "2nd Semester",
          start_date: `${y1 + 1}-01-15`,
          end_date: `${y1 + 1}-05-30`,
          pin: "",
        });
      } else {
        setCloseForm({
          academic_year: `${y1 + 1}-${y2 + 1}`,
          semester: "1st Semester",
          start_date: `${y1 + 1}-08-01`,
          end_date: `${y1 + 1}-12-20`,
          pin: "",
        });
      }
    }
    setShowCloseModal(true);
  };

  const handleCloseTermSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const res = await api.post("/admin/academic-terms/close-term", closeForm);
      notify(res.data.message || "✅ Semester archived into TiDB successfully!");
      setShowCloseModal(false);
      fetchTerms();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.pin?.[0] || "❌ Failed to close semester.";
      notify(msg);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Academic Terms & Archiving</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage academic years, semesters, and TiDB cloud archival transitions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTerm && (
            <button
              type="button"
              onClick={handleOpenCloseModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Archive size={14} />
              <span>Close Active Semester</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Academic Term</span>
          </button>
        </div>
      </div>

      {/* Terms Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-xs font-medium">Loading Academic Terms...</span>
        </div>
      ) : terms.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs font-medium">
          No academic terms configured yet. Click "Add Academic Term" to get started.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Academic Term Name</th>
                <th className="py-3 px-4">Academic Year</th>
                <th className="py-3 px-4">Semester</th>
                <th className="py-3 px-4">Date Range</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {terms.map((term, index) => (
                <tr key={term.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 text-slate-400 font-medium">{index + 1}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{term.name}</td>
                  <td className="py-3 px-4 font-medium text-slate-700">{term.academic_year}</td>
                  <td className="py-3 px-4 font-medium text-slate-700">{term.semester}</td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {term.start_date} → {term.end_date}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {term.is_active ? (
                      <span className="font-extrabold text-emerald-700 text-xs">
                        Active
                      </span>
                    ) : (
                      <span className="font-medium text-slate-500 text-xs">
                        Archived (TiDB)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!term.is_active && (
                        <button
                          type="button"
                          onClick={() => handleActivateTerm(term)}
                          className="px-2 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded cursor-pointer"
                        >
                          Set Active
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(term)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                        title="Edit Term"
                      >
                        <Edit2 size={14} />
                      </button>
                      {!term.is_active && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTerm(term)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Delete Term"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Term Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editTerm ? "Edit Academic Term" : "Add New Academic Term"}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveTerm} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-2027"
                  value={termForm.academic_year}
                  onChange={(e) => setTermForm({ ...termForm, academic_year: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Semester *</label>
                <select
                  value={termForm.semester}
                  onChange={(e) => setTermForm({ ...termForm, semester: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white font-medium"
                >
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                  <option value="Summer Term">Summer Term</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={termForm.start_date}
                    onChange={(e) => setTermForm({ ...termForm, start_date: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={termForm.end_date}
                    onChange={(e) => setTermForm({ ...termForm, end_date: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={termForm.is_active}
                  onChange={(e) => setTermForm({ ...termForm, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Set as Active Semester immediately
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={formLoading}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {formLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>{editTerm ? "Update Term" : "Save Academic Term"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Term Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Close Semester & Roll Over
              </h3>
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200 p-3 rounded-lg leading-relaxed">
              This will archive all completed bookings for <strong>{activeTerm?.name}</strong> to TiDB and initialize the next academic semester for all staff portals.
            </div>

            <form onSubmit={handleCloseTermSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Next Academic Year *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-2027"
                  value={closeForm.academic_year}
                  onChange={(e) => setCloseForm({ ...closeForm, academic_year: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Next Semester *</label>
                <select
                  value={closeForm.semester}
                  onChange={(e) => setCloseForm({ ...closeForm, semester: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white font-medium"
                >
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                  <option value="Summer Term">Summer Term</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={closeForm.start_date}
                    onChange={(e) => setCloseForm({ ...closeForm, start_date: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={closeForm.end_date}
                    onChange={(e) => setCloseForm({ ...closeForm, end_date: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Super Admin Password or Master PIN
                </label>
                <input
                  type="password"
                  placeholder="Enter your account password (e.g. password123)..."
                  value={closeForm.pin}
                  onChange={(e) => setCloseForm({ ...closeForm, pin: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 tracking-wider"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  disabled={formLoading}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {formLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>Archive & Start Next Term</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
