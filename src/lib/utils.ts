import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge classes with Tailwind conflict resolution via clsx + twMerge. */
const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
export default cn;
