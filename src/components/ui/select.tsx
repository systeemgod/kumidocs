"use client";

import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Select as SelectPrimitive } from "radix-ui";
import cn from "@/lib/utils";

interface SelectTriggerProps extends ComponentProps<typeof SelectPrimitive.Trigger> {
  size?: "sm" | "default";
}

const Select = (allProps: ComponentProps<typeof SelectPrimitive.Root>): JSX.Element => (
  <SelectPrimitive.Root {...allProps} data-slot="select" />
);

const SelectGroup = (allProps: ComponentProps<typeof SelectPrimitive.Group>): JSX.Element => (
  <SelectPrimitive.Group {...allProps} data-slot="select-group" />
);

const SelectValue = (allProps: ComponentProps<typeof SelectPrimitive.Value>): JSX.Element => (
  <SelectPrimitive.Value {...allProps} data-slot="select-value" />
);

const SelectScrollUpButton = (
  allProps: ComponentProps<typeof SelectPrimitive.ScrollUpButton>,
): JSX.Element => {
  const { className } = allProps;
  return (
    <SelectPrimitive.ScrollUpButton
      {...allProps}
      data-slot="select-scroll-up-button"
      className={cn("flex cursor-default items-center justify-center py-1", className)}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
};

const SelectScrollDownButton = (
  allProps: ComponentProps<typeof SelectPrimitive.ScrollDownButton>,
): JSX.Element => {
  const { className } = allProps;
  return (
    <SelectPrimitive.ScrollDownButton
      {...allProps}
      data-slot="select-scroll-down-button"
      className={cn("flex cursor-default items-center justify-center py-1", className)}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
};

const SelectTrigger = (allProps: SelectTriggerProps): JSX.Element => {
  const { className, size = "default", children } = allProps;
  return (
    <SelectPrimitive.Trigger
      {...allProps}
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
};

const SelectContent = (allProps: ComponentProps<typeof SelectPrimitive.Content>): JSX.Element => {
  const { className, children, position = "popper", align = "center" } = allProps;
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        {...allProps}
        data-slot="select-content"
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        align={align}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
};

const SelectLabel = (allProps: ComponentProps<typeof SelectPrimitive.Label>): JSX.Element => {
  const { className } = allProps;
  return (
    <SelectPrimitive.Label
      {...allProps}
      data-slot="select-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
    />
  );
};

const SelectItem = (allProps: ComponentProps<typeof SelectPrimitive.Item>): JSX.Element => {
  const { className, children } = allProps;
  return (
    <SelectPrimitive.Item
      {...allProps}
      data-slot="select-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className,
      )}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
};

const SelectSeparator = (
  allProps: ComponentProps<typeof SelectPrimitive.Separator>,
): JSX.Element => {
  const { className } = allProps;
  return (
    <SelectPrimitive.Separator
      {...allProps}
      data-slot="select-separator"
      className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
    />
  );
};

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
