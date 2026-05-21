import { type ComponentProps } from "react";
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const ScrollBar = (
  allProps: ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
): JSX.Element => {
  const { className, orientation = "vertical" } = allProps;
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      {...allProps}
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent",
        className,
      )}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
};

const ScrollArea = (allProps: ComponentProps<typeof ScrollAreaPrimitive.Root>): JSX.Element => {
  const { className, children } = allProps;
  return (
    <ScrollAreaPrimitive.Root
      {...allProps}
      data-slot="scroll-area"
      className={cn("relative overflow-hidden", className)}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="h-full max-h-[inherit] w-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
};

export { ScrollArea, ScrollBar };
