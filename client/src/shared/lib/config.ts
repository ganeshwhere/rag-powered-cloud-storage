/**
 * Application configuration constants
 */

export const APP_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME,
  description: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
  tagline: process.env.NEXT_PUBLIC_APP_TAGLINE,
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  apiTimeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000'),
  maxFileSizeMB: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '100'),
  documentStatusPollInterval: parseInt(process.env.NEXT_PUBLIC_DOCUMENT_STATUS_POLL_INTERVAL || '3000'),
} as const;