import { Construction } from "lucide-react";

function UnderConstruction({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-5 select-none">
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-2xl shadow-blue-600/30 animate-pulse">
        <Construction size={42} className="text-white" />
      </div>
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-400 font-medium max-w-md mx-auto leading-relaxed">{description}</p>
      </div>
      <div className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 border border-blue-100 rounded-full text-xs font-bold text-blue-700">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
        Under Construction — Coming Soon
      </div>
    </div>
  );
}

export function ManageEquipments() {
  return <UnderConstruction title="Manage Equipment" description="Add, edit, and manage AVR and SCO equipment inventory. This page is currently being built." />;
}

export function ManageVenues() {
  return <UnderConstruction title="Manage Venues" description="Configure AVR and SCO venue details, capacity, and availability. This page is under construction." />;
}

export function Reports() {
  return <UnderConstruction title="Reports" description="Generate reports on booking trends, equipment usage, and occupancy. This page is under construction." />;
}
