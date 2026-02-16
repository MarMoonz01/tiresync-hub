import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format "2257514" -> "225/75R14"
export function formatTireSize(input: string): string | null {
  const clean = input.trim();
  // Case 7 digits: 1955515
  if (/^\d{7}$/.test(clean)) {
    return `${clean.substring(0, 3)}/${clean.substring(3, 5)}R${clean.substring(5, 7)}`;
  }
  return null;
}

// Normalize for comparison (remove spaces/dashes/dots, lowercase)
export function normalizeSearch(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}
