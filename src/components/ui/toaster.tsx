"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, toast } from "sonner";
import type { CSSProperties } from "react";
import type { ToasterProps } from "sonner";
import { useTheme } from "next-themes";

const Toaster = (allProps: ToasterProps): JSX.Element => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        error: <OctagonXIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
        success: <CircleCheckIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
      }}
      style={
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        {
          "--border-radius": "var(--radius)",
          "--normal-bg": "var(--popover)",
          "--normal-border": "var(--border)",
          "--normal-text": "var(--popover-foreground)",
        } as CSSProperties
      }
      {...allProps}
    />
  );
};

export { toast };
export default Toaster;
