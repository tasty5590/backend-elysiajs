/**
 * Authentication utility functions
 */

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 16);
    const extraRandom = Math.random().toString(36).substr(2, 16);

    return `${timestamp}${randomPart}${extraRandom}`;
}

/**
 * Generate a unique ID for database records
 */
export function generateId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${random}`;
}
