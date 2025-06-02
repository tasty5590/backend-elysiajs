import { db } from "../db/client";
import { session } from "../db/schema";
import { lt, count } from "drizzle-orm";

/**
 * Cleanup expired sessions from the database
 * Removes sessions where expiresAt is less than current date/time
 */
export async function cleanupExpiredSessions() {
    try {
        const now = new Date();

        // First count expired sessions before deletion
        const expiredCount = await db
            .select({ count: count() })
            .from(session)
            .where(lt(session.expiresAt, now));

        const deletedCount = expiredCount[0]?.count || 0;

        // Delete sessions that have expired
        if (deletedCount > 0) {
            await db
                .delete(session)
                .where(lt(session.expiresAt, now));
        }

        if (deletedCount > 0) {
            console.log(`🧹 Cleaned up ${deletedCount} expired session(s) at ${now.toISOString()}`);
        } else {
            console.log(`✅ No expired sessions to clean up at ${now.toISOString()}`);
        }

        return { deletedCount, timestamp: now.toISOString() };
    } catch (error) {
        console.error('❌ Error cleaning up expired sessions:', error);
        throw error;
    }
}

/**
 * Get statistics about sessions (for monitoring)
 */
export async function getSessionStats() {
    try {
        const now = new Date();

        // Count total sessions
        const totalResult = await db
            .select({ count: count() })
            .from(session);

        // Count expired sessions
        const expiredResult = await db
            .select({ count: count() })
            .from(session)
            .where(lt(session.expiresAt, now));

        const totalSessions = totalResult[0]?.count || 0;
        const expiredSessions = expiredResult[0]?.count || 0;
        const activeSessions = totalSessions - expiredSessions;

        return {
            total: totalSessions,
            active: activeSessions,
            expired: expiredSessions,
            timestamp: now.toISOString()
        };
    } catch (error) {
        console.error('❌ Error getting session stats:', error);
        throw error;
    }
}
