/**
 * Authentication utility functions
 */

import { db } from "../db/client";
import { user, session } from "../db/schema";
import { eq, and, gt } from "drizzle-orm";

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

/**
 * Session validation result type
 */
export interface SessionValidationResult {
    success: boolean;
    user?: {
        id: string;
        name: string;
        email: string;
        emailVerified: boolean;
        image: string | null;
        createdAt: Date;
        updatedAt: Date;
    };
    session?: {
        id: string;
        token: string;
        expiresAt: Date;
        createdAt: Date;
        ipAddress: string | null;
        userAgent: string | null;
    };
    error?: string;
}

/**
 * Validate session token and return user/session data
 */
export async function validateSession(token: string): Promise<SessionValidationResult> {
    try {
        // Query the session directly from the database
        const sessionData = await db
            .select({
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    image: user.image,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                },
                session: {
                    id: session.id,
                    token: session.token,
                    expiresAt: session.expiresAt,
                    createdAt: session.createdAt,
                    ipAddress: session.ipAddress,
                    userAgent: session.userAgent,
                }
            })
            .from(session)
            .leftJoin(user, eq(session.userId, user.id))
            .where(
                and(
                    eq(session.token, token),
                    gt(session.expiresAt, new Date())
                )
            )
            .limit(1);

        if (!sessionData.length || !sessionData[0].user) {
            return {
                success: false,
                error: 'Invalid or expired session'
            };
        }

        return {
            success: true,
            user: sessionData[0].user,
            session: sessionData[0].session,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Session validation failed'
        };
    }
}

/**
 * Extract and validate authorization token from request headers
 */
export function extractAuthToken(authHeader: string | null | undefined): { success: boolean; token?: string; error?: string } {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            success: false,
            error: 'Missing or invalid authorization header'
        };
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token.trim()) {
        return {
            success: false,
            error: 'Empty authorization token'
        };
    }

    return {
        success: true,
        token
    };
}
