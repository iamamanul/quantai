"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = false,
  ...props
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-xl shadow-2xl border border-blue-800/50", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-2 pb-4 relative items-center",
        caption_label: "text-lg font-semibold text-white",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-slate-800 border-blue-700 hover:bg-slate-700 hover:border-blue-600 transition-colors text-white"
        ),
        nav_button_previous: "absolute left-2",
        nav_button_next: "absolute right-2",
        table: "w-full border-collapse",
        head_row: "flex w-full",
        head_cell: "text-blue-300 rounded-md w-full flex-1 font-medium text-sm py-2 text-center",
        row: "flex w-full mt-1",
        cell: "flex-1 h-10 text-center text-sm p-0 relative hover:bg-blue-800/30 transition-colors",
        day: cn(
          "h-9 w-9 sm:h-10 sm:w-10 p-0 font-medium text-gray-300 hover:bg-blue-800/50 hover:text-white rounded-full transition-all duration-200 flex items-center justify-center mx-auto"
        ),
        day_selected: "rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 font-semibold shadow-lg ring-2 ring-blue-400/50",
        day_today: "rounded-full bg-slate-700 text-white font-semibold ring-2 ring-blue-400",
        day_outside: "text-gray-600 opacity-40",
        day_disabled: "text-gray-600 opacity-30 cursor-not-allowed",
        day_range_middle: "aria-selected:bg-blue-800/30 aria-selected:text-blue-300",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4 text-blue-300" />,
        IconRight: () => <ChevronRight className="h-4 w-4 text-blue-300" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }