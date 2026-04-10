// src/lib/constants.ts
export const DEFAULT_QUOTA = 20;
/** Image output dimension in pixels (width = height). Matches Gemini API accepted value. */
export const DEFAULT_RESOLUTION = '1024' as const;
export const PIN_LENGTH = 4;
/** OWASP-recommended minimum for bcrypt cost factor (2024). */
export const BCRYPT_ROUNDS = 10;
/** Milliseconds between quota polling requests on the client. */
export const QUOTA_POLL_INTERVAL = 5000;
