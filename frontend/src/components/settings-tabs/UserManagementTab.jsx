import { useState } from "react";
import { UsersSubTab, RolesSubTab } from "./user-management";

// ─── Sub-tab IDs ─────────────────────────────────────────────────────────────
const SUB_TABS = [
  { id: "users", label: "Users" },
  { id: "roles", label: "Roles" },
];

export default function UserManagementTab({ showMsg }) {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="space-y-5">
      {/* Sub-tab Navigation Pills */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-0">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer -mb-px ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
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
      </div>
    </div>
  );
}
