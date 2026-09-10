import React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchInput({ value, onChange, placeholder = "Search...", className, ...props }) {
  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <Search size={16} className="absolute left-3.5 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 min-h-[40px] max-sm:min-h-[44px] bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        {...props}
      />
    </div>
  );
}

export default SearchInput;
