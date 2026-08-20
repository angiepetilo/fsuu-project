import { Loader2, CheckCircle2, X, Pencil } from "lucide-react";

/**
 * HistoryEditModal — Edit Record Status / Mark as Solved
 * All state (editStatus, editNotes, editLoading) lives in HistoryLog and is passed as props.
 */
export default function HistoryEditModal({
  editingRecord,
  editStatus,
  setEditStatus,
  editNotes,
  setEditNotes,
  editLoading,
  onClose,
  onSave,
}) {
  if (!editingRecord) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Pencil size={16} className="text-slate-600" />
            Edit Record Status ({editingRecord.reference_code || editingRecord.tracking_number?.reference_code || (typeof editingRecord.tracking_number === 'string' ? editingRecord.tracking_number : '') || editingRecord.id})
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg border border-slate-200 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-3 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Update Record Status *</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-xs focus:outline-none focus:border-slate-400"
            >
              <option value="completed">Completed</option>
              <option value="solved">Solved (Fine / Damage Settled)</option>
              <option value="damaged">Damaged</option>
              <option value="lost">Lost</option>
              <option value="approved">Approved</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Status Notes / Remarks</label>
            <textarea
              rows={3}
              placeholder="e.g. Fine settled by requestor or equipment replaced..."
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editLoading}
              className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-900 text-slate-900 font-extrabold text-xs cursor-pointer flex items-center gap-1.5"
            >
              {editLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Save Status
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
