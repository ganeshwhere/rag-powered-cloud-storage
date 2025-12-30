/**
 * Application configuration constants
 */

export const APP_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME,
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
} as const;