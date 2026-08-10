import { X, Plus, Edit3, Loader2, Barcode } from "lucide-react";

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
      {/* ── Edit Equipment Modal (Clean White Header - Item 35) ── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Clean White Header - Item 35 */}
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Edit3 size={18} className="text-blue-600" />
                Edit Equipment: {editingItem.name}
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditEquipmentSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Equipment Name & Model *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Barcode - USB Scanner or Manual Entry */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1 flex items-center justify-between">
                    <span>Model Barcode *</span>
                    <span className="text-[10px] text-blue-600 font-semibold">(Scan/Type)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Scan USB or type code..."
                    value={editFormData.barcode}
                    onKeyDown={handleBarcodeKeyDown}
                    onChange={e => setEditFormData({ ...editFormData, barcode: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-blue-700 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Category *</label>
                  <select
                    value={editFormData.category}
                    onChange={e => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    {categories && categories.length > 0 ? (
                      categories.map((cat, idx) => {
                        const val = typeof cat === "string" ? cat : (cat.eq_type || cat.eq_name || cat.name);
                        const label = typeof cat === "string" ? cat : (cat.eq_name || cat.eq_type || cat.name);
                        return <option key={cat.id || idx} value={val}>{label}</option>;
                      })
                    ) : (
                      <option value="">No categories</option>
                    )}
                  </select>
                </div>
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
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="available">Available</option>
                    <option value="released">Released / In-Use</option>
                    <option value="maintenance">Under Maintenance</option>
                    <option value="decommissioned">Decommissioned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Condition *</label>
                  <select
                    value={editFormData.condition || "Good"}
                    onChange={e => setEditFormData({ ...editFormData, condition: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="Good">Good</option>
                    <option value="Minor Wear">Minor Wear &amp; Tear</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Under Repair">Under Repair</option>
                    <option value="Lost">Lost / Decommissioned</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={editFormData.description}
                  onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Equipment Modal (Clean White Header - Item 35) ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Clean White Header - Item 35 */}
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-blue-600" />
                Add New Equipment Model
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddEquipment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Equipment Name & Model *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sony Alpha A7 IV 4K Camera"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Barcode - USB Scanner or Manual Entry */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1 flex items-center justify-between">
                    <span>Model Barcode *</span>
                    <span className="text-[10px] text-blue-600 font-semibold">(Scan/Type)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Scan USB or type code..."
                    value={formData.barcode}
                    onKeyDown={handleBarcodeKeyDown}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-blue-700 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    {categories && categories.length > 0 ? (
                      categories.map((cat, idx) => {
                        const val = typeof cat === "string" ? cat : (cat.eq_type || cat.eq_name || cat.name);
                        const label = typeof cat === "string" ? cat : (cat.eq_name || cat.eq_type || cat.name);
                        return <option key={cat.id || idx} value={val}>{label}</option>;
                      })
                    ) : (
                      <option value="">⚠️ Create Category in Settings First</option>
                    )}
                  </select>
                </div>
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
                    <option value="released">Released / In-Use</option>
                    <option value="maintenance">Under Maintenance</option>
                    <option value="decommissioned">Decommissioned</option>
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
                    <option value="Minor Wear">Minor Wear &amp; Tear</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Under Repair">Under Repair</option>
                    <option value="Lost">Lost / Decommissioned</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional specs or condition notes..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Add to Inventory</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
