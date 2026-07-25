import { Settings as SettingsIcon } from "lucide-react";

export default function SysadSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">System Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage global system configurations</p>
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-200">
          <SettingsIcon size={32} className="text-slate-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Settings Coming Soon</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Global system configurations and preferences will be available here. User management has been moved to a dedicated tab.
          </p>
        </div>
      </div>
    </div>
  );
}
