import type { Dispatch, SetStateAction } from "react";
import useMountEffect from "./use-mount-effect";
import { useState } from "react";

export default function useInfoPanel(filePath: string): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [infoOpen, setInfoOpen] = useState(
    () => localStorage.getItem("kumidocs:info-open") === "true",
  );

  useMountEffect(() => {
    const handler = (ev: Event): void => {
      const detail = (ev as CustomEvent<string>).detail;
      if (detail === filePath) {
        setInfoOpen((prev) => {
          const next = !prev;
          if (next) {
            localStorage.setItem("kumidocs:info-open", "true");
          } else {
            localStorage.removeItem("kumidocs:info-open");
          }
          return next;
        });
      }
    };
    window.addEventListener("kumidocs:open-info", handler);
    return (): void => {
      window.removeEventListener("kumidocs:open-info", handler);
    };
  });

  return [infoOpen, setInfoOpen];
}
