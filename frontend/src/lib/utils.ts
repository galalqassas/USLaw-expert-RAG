import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Convert raw error messages to user-friendly messages.
 */
export function getFriendlyErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes('network') || lower.includes('fetch') || lower.includes('econnrefused')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'The request took too long. Please try again.';
  }
  if (lower.includes('rate limit') || lower.includes('429')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (lower.includes('401') || lower.includes('unauthorized')) {
    return 'Authentication failed. Please refresh the page and try again.';
  }
  if (lower.includes('500') || lower.includes('internal server')) {
    return 'Something went wrong on our end. Please try again later.';
  }
  if (lower.includes('503') || lower.includes('unavailable')) {
    return 'The service is temporarily unavailable. Please try again later.';
  }
  
  return 'Something went wrong. Please try again.';
}
