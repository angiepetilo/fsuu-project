import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ...props
}) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 min-h-[40px] max-sm:h-11 max-sm:min-h-[44px] w-full min-w-0 rounded-lg border border-border bg-card px-3.5 py-2 text-base md:text-sm text-foreground placeholder:text-muted-foreground transition-all outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-card dark:border-border dark:text-foreground dark:placeholder:text-muted-foreground",
        className
      )}
      {...props} />
  );
}

export { Input }
