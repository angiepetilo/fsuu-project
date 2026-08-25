import { X, Loader2 } from "lucide-react";

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

  const inputClasses = "w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-normal text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors placeholder:text-slate-400";
  const labelClasses = "block text-xs font-medium text-slate-700 mb-1.5";

  return (
    <>
      {/* ── Edit Equipment Physical Unit Modal ── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Edit Physical Unit: {editingItem.barcode || [editingItem.brand, editingItem.model].filter(Boolean).join(' ') || 'Unit'}
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditEquipmentSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Equipment Category *</label>
                  <select
                    required
                    value={editFormData.category}
                    onChange={e => setEditFormData({ ...editFormData, category: e.target.value })}
                    className={`${inputClasses} cursor-pointer`}
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

                <div>
                  <label className={labelClasses}>Barcode *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 12345-XYZ"
                    value={editFormData.barcode}
                    onKeyDown={handleBarcodeKeyDown}
                    onChange={e => setEditFormData({ ...editFormData, barcode: e.target.value })}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Epson, Sony, Acer"
                    value={editFormData.brand || ""}
                    onChange={e => setEditFormData({ ...editFormData, brand: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>Model Name</label>
                  <input
                    type="text"
                    placeholder="e.g. PowerLite 1780W, Alpha A7 IV"
                    value={editFormData.model || ""}
                    onChange={e => setEditFormData({ ...editFormData, model: e.target.value })}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={labelClasses}>Lifespan (Yrs) *</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    required
                    placeholder="5"
                    value={editFormData.lifespan_years || 5}
                    onChange={e => setEditFormData({ ...editFormData, lifespan_years: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>Date Purchased</label>
                  <input
                    type="date"
                    value={editFormData.date_purchased}
                    onChange={e => setEditFormData({ ...editFormData, date_purchased: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>Status *</label>
                  <select
                    value={editFormData.status}
                    onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                    disabled={editFormData.condition === "Damaged"}
                    className={`${inputClasses} cursor-pointer disabled:opacity-50`}
                  >
                    <option value="Available">Available</option>
                    <option value="Released">Released</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>

                <div>
                  <label className={labelClasses}>Condition *</label>
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
                    className={`${inputClasses} cursor-pointer`}
                  >
                    <option value="Good">Good</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClasses}>Description / Remarks (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Optional placement notes or storage cabinet..."
                  value={editFormData.description}
                  onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-xs font-normal text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors placeholder:text-slate-400 resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-xs flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </span>
                  ) : (
                    <span>Update Physical Unit</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Equipment Physical Unit Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Add Physical Equipment Unit
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddEquipment} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Equipment Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className={`${inputClasses} cursor-pointer`}
                  >
                    {categories && categories.length > 0 ? (
                      categories.map((cat, idx) => {
                        const nameStr = typeof cat === "string" ? cat : (cat.eq_name || cat.name);
                        return <option key={cat.id || idx} value={nameStr}>{nameStr}</option>;
                      })
                    ) : (
                      <option value="">Create Category in Settings First</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className={labelClasses}>Barcode *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 12345-XYZ"
                    value={formData.barcode}
                    onKeyDown={handleBarcodeKeyDown}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Epson, Sony, Acer"
                    value={formData.brand || ""}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>Model Name</label>
                  <input
                    type="text"
                    placeholder="e.g. PowerLite 1780W, Alpha A7 IV"
                    value={formData.model || ""}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={labelClasses}>Lifespan (Yrs) *</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    required
                    placeholder="5"
                    value={formData.lifespan_years || 5}
                    onChange={e => setFormData({ ...formData, lifespan_years: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>Date Purchased</label>
                  <input
                    type="date"
                    value={formData.date_purchased}
                    onChange={e => setFormData({ ...formData, date_purchased: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>Status *</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className={`${inputClasses} cursor-pointer`}
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>

                <div>
                  <label className={labelClasses}>Condition *</label>
                  <select
                    value={formData.condition || "Good"}
                    onChange={e => setFormData({ ...formData, condition: e.target.value })}
                    className={`${inputClasses} cursor-pointer`}
                  >
                    <option value="Good">Good</option>
                    <option value="Under Repair">Under Repair</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClasses}>Description / Remarks (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Optional placement notes or storage cabinet..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-xs font-normal text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors placeholder:text-slate-400 resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-xs flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </span>
                  ) : (
                    <span>Register Physical Unit</span>
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
