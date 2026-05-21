"use client";

import { type ComponentProps } from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const TooltipProvider = (
  allProps: ComponentProps<typeof TooltipPrimitive.Provider>,
): JSX.Element => {
  const { delayDuration = 0 } = allProps;
  return (
    <TooltipPrimitive.Provider
      {...allProps}
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
    />
  );
};

const Tooltip = (allProps: ComponentProps<typeof TooltipPrimitive.Root>): JSX.Element => (
  <TooltipPrimitive.Root {...allProps} data-slot="tooltip" />
);

const TooltipTrigger = (allProps: ComponentProps<typeof TooltipPrimitive.Trigger>): JSX.Element => (
  <TooltipPrimitive.Trigger {...allProps} data-slot="tooltip-trigger" />
);

const TooltipContent = (allProps: ComponentProps<typeof TooltipPrimitive.Content>): JSX.Element => {
  const { className, sideOffset = 0, children } = allProps;
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        {...allProps}
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-fit origin-(--radix-tooltip-content-transform-origin) animate-in rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className,
        )}
      >
        {children}
        <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
};

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
