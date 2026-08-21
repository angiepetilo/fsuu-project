"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme}
      position="top-center"
      className="toaster group"
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-slate-200 group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl group-[.toaster]:p-3.5 group-[.toaster]:font-medium group-[.toaster]:text-xs group-[.toaster]:flex group-[.toaster]:items-center group-[.toaster]:gap-3",
          title: "text-xs font-bold text-slate-900",
          description: "text-[11.5px] font-normal text-slate-500",
          actionButton:
            "group-[.toast]:bg-blue-600 group-[.toast]:text-white group-[.toast]:rounded-lg group-[.toast]:text-xs group-[.toast]:font-semibold",
          cancelButton:
            "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-600 group-[.toast]:rounded-lg group-[.toast]:text-xs",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4.5 text-emerald-600 shrink-0" />,
        info: <InfoIcon className="size-4.5 text-blue-600 shrink-0" />,
        warning: <TriangleAlertIcon className="size-4.5 text-amber-600 shrink-0" />,
        error: <OctagonXIcon className="size-4.5 text-rose-600 shrink-0" />,
        loading: <Loader2Icon className="size-4.5 text-blue-600 animate-spin shrink-0" />,
      }}
      {...props} />
  );
}

export { Toaster }
