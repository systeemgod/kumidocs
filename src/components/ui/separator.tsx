"use client";

import { type ComponentProps } from "react";
import { Separator as SeparatorPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const Separator = (allProps: ComponentProps<typeof SeparatorPrimitive.Root>): JSX.Element => {
  const { className, orientation = "horizontal", decorative = true } = allProps;
  return (
    <SeparatorPrimitive.Root
      {...allProps}
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className,
      )}
    />
  );
};

export { Separator };
