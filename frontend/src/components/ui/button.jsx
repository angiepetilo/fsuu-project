import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva } from "class-variance-authority";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90 shadow-2xs active:opacity-95",
        outline:
          "border-border bg-card text-foreground hover:bg-muted hover:text-foreground dark:border-border dark:bg-card dark:hover:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-muted active:bg-muted",
        ghost:
          "hover:bg-muted hover:text-foreground dark:hover:bg-muted",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90 active:opacity-95",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 min-h-[36px] max-sm:min-h-[44px] gap-2 px-3.5 py-2 text-sm rounded-lg",
        xs: "h-6 min-h-[24px] gap-1 rounded-md px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 min-h-[32px] gap-1.5 rounded-md px-2.5 text-xs font-semibold [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 min-h-[44px] gap-2.5 rounded-xl px-5 text-base font-semibold",
        icon: "size-9 min-h-[36px] min-w-[36px] max-sm:min-h-[44px] max-sm:min-w-[44px] rounded-lg",
        "icon-xs": "size-6 min-h-[24px] min-w-[24px] rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 min-h-[28px] min-w-[28px] rounded-md",
        "icon-lg": "size-11 min-h-[44px] min-w-[44px] rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function hasChildSpinner(node) {
  if (!node) return false;
  if (Array.isArray(node)) return node.some(hasChildSpinner);
  if (typeof node === "object" && node !== null && node.props) {
    const cls = node.props.className;
    if (typeof cls === "string" && cls.includes("animate-spin")) return true;
    return hasChildSpinner(node.props.children);
  }
  return false;
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild,
  loading = false,
  disabled,
  children,
  ...props
}) {
  const showSpinner = loading && !hasChildSpinner(children);

  return (
    <ButtonPrimitive
      data-slot="button"
      data-loading={loading ? "true" : undefined}
      disabled={disabled || loading}
      className={cn(
        buttonVariants({ variant, size, className }),
        loading && "opacity-80 pointer-events-none"
      )}
      {...props}
    >
      {showSpinner && <Loader2 className="animate-spin size-4 shrink-0" />}
      {children}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants }
