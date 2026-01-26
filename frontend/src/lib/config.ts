// Environment configuration
// In production, set NEXT_PUBLIC_API_URL in .env.local

export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
} as const;
