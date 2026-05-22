import type { EffectCallback } from "react";
import { useEffect } from "react";

export const useMountEffect = (effect: EffectCallback): void => {
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
};
