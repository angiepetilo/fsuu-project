import { useState } from "react";
import { UsersSubTab, RolesSubTab, PermissionsSubTab } from "./user-management";

// ─── Sub-tab IDs ─────────────────────────────────────────────────────────────
const SUB_TABS = [
  { id: "users", label: "Users" },
  { id: "roles", label: "Roles" },
  { id: "permissions", label: "Permissions" },
];

export default function UserManagementTab({ showMsg }) {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="space-y-5">
      {/* Sub-tab Navigation Pills */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-0">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer -mb-px ${
              activeTab === tab.id
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Panels */}
      <div>
        {activeTab === "users" && <UsersSubTab showMsg={showMsg} />}
        {activeTab === "roles" && <RolesSubTab />}
        {activeTab === "permissions" && <PermissionsSubTab />}
      </div>
    </div>
  );
}
