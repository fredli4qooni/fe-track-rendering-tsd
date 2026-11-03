/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * A utility function for generating class names.
 *
 * @param inputs - The class names to be merged.
 * @returns - The merged class names.
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
