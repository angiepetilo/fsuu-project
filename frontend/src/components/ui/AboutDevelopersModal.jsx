import React, { useState } from "react";
import { X, GraduationCap, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AboutDevelopersModal({ isOpen, onClose }) {
  const [hoveredMember, setHoveredMember] = useState(null);

  if (!isOpen) return null;

  const team = [
    {
      id: "angie",
      name: "Angie K. Petilo",
      role: "Lead Developer",
      photo: "/team/angie.jpg",
      initials: "AP",
      color: "from-blue-600 to-indigo-700",
    },
    {
      id: "jaywarren",
      name: "Jay Warren H. Trubias",
      role: "Assistant Developer",
      photo: "/team/jaywarren.jpg",
      initials: "JT",
      color: "from-indigo-600 to-violet-700",
    },
    {
      id: "phoebe",
      name: "Ma. Phoebe Burdeos",
      role: "QA & Documentation Specialist",
      photo: "/team/phoebe.jpg",
      initials: "MB",
      color: "from-emerald-600 to-teal-700",
    },
    {
      id: "raven",
      name: "Raven Greg J. Espiritu",
      role: "Systems Analyst & Documentation",
      photo: "/team/raven.jpg",
      initials: "RE",
      color: "from-amber-600 to-orange-700",
    },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-lg flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Plain Clean Header */}
        <div className="px-5 sm:px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-900/40">
              <GraduationCap size={19} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Capstone Development Team
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                Bachelor of Science in Information Technology • BSIT
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-2.5 bg-slate-100/70 dark:bg-slate-950/60 overflow-hidden relative">
          
          {/* Project Summary Banner */}
          <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-900/40">
              <Laptop size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                FSUU Facilities &amp; Equipment Booking System
              </h3>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
                Official Capstone Project • Father Saturnino Urios University
              </p>
            </div>
          </div>

          {/* Members Area */}
          <div className="min-h-[220px] flex flex-col justify-center">
            {hoveredMember ? (
              // When a developer is hovered: show ONLY that developer to save space and prevent modal expansion
              (() => {
                const active = team.find((m) => m.id === hoveredMember) || team[0];
                return (
                  <div
                    onMouseLeave={() => setHoveredMember(null)}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-500/80 dark:border-blue-500/80 shadow-md ring-2 ring-blue-500/10 p-3 sm:p-3.5 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200"
                  >
                    {/* Photo */}
                    <div className="relative w-40 sm:w-44 h-48 sm:h-52 rounded-xl overflow-hidden shadow-md border border-slate-200/90 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 mb-2.5">
                      <img
                        src={active.photo}
                        alt={active.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Name & Role (name moved down below photo) */}
                    <div className="text-center">
                      <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                        {active.name}
                      </h4>
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                        {active.role}
                      </p>
                    </div>

                    {/* Thumbnail Switcher (no text/names, lets user hover any developer directly) */}
                    <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 w-full justify-center">
                      {team.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onMouseEnter={() => setHoveredMember(m.id)}
                          onClick={() => setHoveredMember(m.id)}
                          className={`w-8 h-8 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                            m.id === active.id
                              ? "border-blue-600 scale-110 shadow-xs ring-1 ring-blue-500/20"
                              : "border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100 hover:scale-105"
                          }`}
                          title={m.name}
                        >
                          <img src={m.photo} alt={m.name} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()
            ) : (
              // Idle state: show all 4 members in compact rows
              <div className="space-y-2">
                {team.map((member) => (
                  <div
                    key={member.id}
                    onMouseEnter={() => setHoveredMember(member.id)}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 p-2.5 sm:p-3 shadow-2xs flex items-center gap-3 transition-all cursor-pointer hover:bg-blue-50/30 dark:hover:bg-blue-950/30 group"
                  >
                    {/* Small Thumbnail */}
                    <div className="relative w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                      <img
                        src={member.photo}
                        alt={member.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                      />
                    </div>

                    {/* Name & Role */}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {member.name}
                      </h4>
                      <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                        {member.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Institutional Note */}
          <div className="p-2 sm:p-2.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200/60 dark:border-blue-900/40 text-[10.5px] text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
            🎓 Developed in partial fulfillment of the requirements for the degree in <strong>Bachelor of Science in Information Technology (BSIT)</strong>, Father Saturnino Urios University, Butuan City.
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end shrink-0">
          <Button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-black rounded-xl px-5 py-2 cursor-pointer shadow-xs"
          >
            Close
          </Button>
        </div>

      </div>
    </div>
  );
}
