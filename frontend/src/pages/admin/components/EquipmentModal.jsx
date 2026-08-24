import { X, Plus, Edit3, Loader2, Barcode, Package } from "lucide-react";

export default function EquipmentModal({
  showAddModal,
  setShowAddModal,
  editingItem,
  setEditingItem,
  formData,
  setFormData,
  editFormData,
  setEditFormData,
  handleAddEquipment,
  handleEditEquipmentSubmit,
  isSubmitting,
  categories = ["Projector", "Sound System", "Camera", "Microphone", "Lighting", "Switchers/Mixers", "AV Equipment"],
}) {
  if (!showAddModal && !editingItem) return null;

  const handleBarcodeKeyDown = (e) => {
    // If USB barcode scanner fires Enter keypress
    if (e.key === "Enter") {
      e.preventDefault();
      // Keep input captured
    }
  };

  return (
    <>
      {/* ── Edit Equipment Physical Unit Modal (Clean White Header) ── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Clean White Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">
                Edit Physical Unit: {editingItem.barcode || editingItem.name}
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditEquipmentSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Equipment Category *</label>
                  <select
                    required
                    value={editFormData.category}
                    onChange={e => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    {categories && categories.length > 0 ? (
                      categories.map((cat, idx) => {
                        const nameStr = typeof cat === "string" ? cat : (cat.eq_name || cat.name);
                        return <option key={cat.id || idx} value={nameStr}>{nameStr}</option>;
                      })
                    ) : (
                      <option value="">No categories created</option>
                    )}
                  </select>
                </div>

                {/* Barcode - USB Scanner or Manual Entry */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1 flex items-center justify-between">
                    <span>Serial / Barcode *</span>
                    <span className="text-[10px] text-blue-600 font-semibold">(Scan/Type)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 12345-XYZ"
                    value={editFormData.barcode}
                    onKeyDown={handleBarcodeKeyDown}
                    onChange={e => setEditFormData({ ...editFormData, barcode: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-blue-700 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Brand / Manufacturer</label>
                  <input
                    type="text"
                    placeholder="e.g. Epson, Sony, Acer"
                    value={editFormData.brand || ""}
                    onChange={e => setEditFormData({ ...editFormData, brand: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Model Name</label>
                  <input
                    type="text"
                    placeholder="e.g. PowerLite 1780W"
                    value={editFormData.model || ""}
                    onChange={e => setEditFormData({ ...editFormData, model: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Unit Nickname / Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. Unit #1, Main Stage Mic"
                  value={editFormData.name}
                  onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Lifespan (Yrs) *</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    required
                    value={editFormData.lifespan_years || 5}
                    onChange={e => setEditFormData({ ...editFormData, lifespan_years: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Date Purchased</label>
                  <input
                    type="date"
                    value={editFormData.date_purchased}
                    onChange={e => setEditFormData({ ...editFormData, date_purchased: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Status *</label>
                  <select
                    value={editFormData.status}
                    onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                    disabled={editFormData.condition === "Damaged"}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none disabled:opacity-50"
                  >
                    <option value="Available">Available</option>
                    <option value="Released">Released</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Condition *</label>
                  <select
                    value={editFormData.condition || "Good"}
                    onChange={e => {
                      const val = e.target.value;
                      const newStatus = val === "Good" ? "available" : "unavailable";
                      setEditFormData({
                        ...editFormData,
                        condition: val,
                        status: newStatus,
                      });
                    }}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="Good">Good</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional unit notes or location placement..."
                  value={editFormData.description}
                  onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Edit3 size={14} />
                      <span>Update Physical Unit</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Equipment Physical Unit Modal (Clean White Header) ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Clean White Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Package size={16} className="text-blue-600" />
                Add Physical Equipment Unit
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddEquipment} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Equipment Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    {categories && categories.length > 0 ? (
                      categories.map((cat, idx) => {
                        const nameStr = typeof cat === "string" ? cat : (cat.eq_name || cat.name);
                        return <option key={cat.id || idx} value={nameStr}>{nameStr}</option>;
                      })
                    ) : (
                      <option value="">⚠️ Create Category in Settings First</option>
                    )}
                  </select>
                </div>

                {/* Barcode - USB Scanner or Manual Entry */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1 flex items-center justify-between">
                    <span>Serial / Asset ID / Barcode *</span>
                    <span className="text-[10px] text-blue-600 font-semibold">(Scan/Type)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 12345-XYZ"
                    value={formData.barcode}
                    onKeyDown={handleBarcodeKeyDown}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-blue-700 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Brand / Manufacturer</label>
                  <input
                    type="text"
                    placeholder="e.g. Epson, Sony, Acer"
                    value={formData.brand || ""}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Model Name</label>
                  <input
                    type="text"
                    placeholder="e.g. PowerLite 1780W, Alpha A7 IV"
                    value={formData.model || ""}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Unit Nickname / Identifier (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Unit #1 (defaults to Brand + Model)"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Lifespan (Yrs) *</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    required
                    value={formData.lifespan_years || 5}
                    onChange={e => setFormData({ ...formData, lifespan_years: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Date Purchased</label>
                  <input
                    type="date"
                    value={formData.date_purchased}
                    onChange={e => setFormData({ ...formData, date_purchased: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Status *</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Condition *</label>
                  <select
                    value={formData.condition || "Good"}
                    onChange={e => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="Good">Good</option>
                    <option value="Under Repair">Under Repair</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Description / Remarks (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Optional placement notes or storage cabinet..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>Register Physical Unit</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
