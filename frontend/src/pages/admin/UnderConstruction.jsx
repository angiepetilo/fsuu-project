import { Construction, Building } from "lucide-react";
import { useOutletContext } from "react-router-dom";

function UnderConstruction({ title, description }) {
  const context = useOutletContext();
  const selectedOffice = context?.selectedOffice ?? "All Offices";
  const setSelectedOffice = context?.setSelectedOffice;

  return (
    <div className="space-y-6">
      {/* Top Header with Office Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium text-slate-800 tracking-tight">{title}</h1>
          <p className="text-sm text-slate-400 mt-0.5">{description}</p>
        </div>
        {setSelectedOffice && (
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs text-sm font-semibold text-slate-700 self-start sm:self-auto">
            <Building size={15} className="text-blue-600 flex-shrink-0" />
            <span className="text-slate-400 font-normal">Office:</span>
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="All Offices">All Offices</option>
              <option value="FSUU Main (AVR Center)">FSUU Main (AVR Center)</option>
              <option value="FSUU Morelos Campus">FSUU Morelos Campus</option>
              <option value="Property & Inventory Office">Property & Inventory Office</option>
              <option value="IT & Technology Services">IT & Technology Services</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-5 select-none pt-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-xl shadow-blue-600/25 animate-pulse">
          <Construction size={36} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-medium text-slate-800 mb-1">{title} Module</h2>
          <p className="text-slate-400 font-medium text-xs sm:text-sm max-w-md mx-auto leading-relaxed">{description}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-xs font-bold text-blue-700">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          Under Construction — Active Development
        </div>
      </div>
    </div>
  );
}

export function ManageEquipments() {
  return <UnderConstruction title="Manage Equipment" description="Add, edit, and manage AVR and SCO equipment inventory across university offices." />;
}

export function ManageVenues() {
  return <UnderConstruction title="Manage Venues" description="Configure AVR and SCO venue details, capacity, and schedule availability." />;
}

export function Reports() {
  return <UnderConstruction title="Reports" description="Generate analytical reports on venue bookings, equipment usage, and peak occupancy." />;
}
