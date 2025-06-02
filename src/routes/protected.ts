import { Elysia } from "elysia";
import { db } from "../db/client";
import { user, session } from "../db/schema";
import { eq, and, gt, ne } from "drizzle-orm";

export const protectedRoutes = new Elysia({ prefix: "/api" })
    .derive(async ({ request, set }) => {
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            set.status = 401;
            throw new Error('Missing authorization header');
        }

        const token = authHeader.replace('Bearer ', '');

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
            set.status = 401;
            throw new Error('Invalid or expired session');
        }

        return {
            user: sessionData[0].user,
            session: sessionData[0].session,
            isAuthenticated: true
        };
    })

    // Protected profile endpoint
    .get("/profile", async ({ user, session }) => {
        return {
            message: "This is a protected endpoint",
            user: user,
            session: session,
            timestamp: new Date().toISOString()
        };
    })

    // Protected users list (example)
    .get("/users", async ({ user: currentUser }) => {
        try {
            const allUsers = await db.select({
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            }).from(user);

            return {
                message: "Users retrieved successfully",
                requestedBy: currentUser.email,
                users: allUsers,
                count: allUsers.length
            };
        } catch (error) {
            return {
                error: "Failed to retrieve users",
                details: error instanceof Error ? error.message : "Unknown error"
            };
        }
    })

    // Update user profile
    .put("/profile", async ({ user: currentUser, body, set }) => {
        try {
            const { name, email } = body as { name?: string; email?: string };

            if (!name && !email) {
                set.status = 400;
                return { error: "At least one field (name or email) is required" };
            }

            const updateData: Partial<{ name: string; email: string; updatedAt: Date }> = {
                updatedAt: new Date()
            };

            if (name) updateData.name = name;
            if (email) updateData.email = email;

            const updatedUser = await db
                .update(user)
                .set(updateData)
                .where(eq(user.id, currentUser.id))
                .returning();

            if (!updatedUser.length) {
                set.status = 404;
                return { error: "User not found" };
            }

            return {
                message: "Profile updated successfully",
                user: {
                    id: updatedUser[0].id,
                    name: updatedUser[0].name,
                    email: updatedUser[0].email,
                    emailVerified: updatedUser[0].emailVerified,
                    image: updatedUser[0].image,
                    createdAt: updatedUser[0].createdAt,
                    updatedAt: updatedUser[0].updatedAt,
                }
            };
        } catch (error) {
            set.status = 500;
            return {
                error: "Failed to update profile",
                details: error instanceof Error ? error.message : "Unknown error"
            };
        }
    })

    // Get user's active sessions
    .get("/sessions", async ({ user: currentUser }) => {
        try {
            const userSessions = await db
                .select({
                    id: session.id,
                    expiresAt: session.expiresAt,
                    createdAt: session.createdAt,
                    ipAddress: session.ipAddress,
                    userAgent: session.userAgent,
                })
                .from(session)
                .where(
                    and(
                        eq(session.userId, currentUser.id),
                        gt(session.expiresAt, new Date())
                    )
                )
                .orderBy(session.createdAt);

            return {
                message: "Sessions retrieved successfully",
                sessions: userSessions,
                count: userSessions.length
            };
        } catch (error) {
            return {
                error: "Failed to retrieve sessions",
                details: error instanceof Error ? error.message : "Unknown error"
            };
        }
    })

    // Revoke a specific session
    .delete("/sessions/:sessionId", async ({ user: currentUser, params, set }) => {
        try {
            const { sessionId } = params;

            const deletedSession = await db
                .delete(session)
                .where(
                    and(
                        eq(session.id, sessionId),
                        eq(session.userId, currentUser.id)
                    )
                )
                .returning();

            if (!deletedSession.length) {
                set.status = 404;
                return { error: "Session not found or not authorized" };
            }

            return {
                message: "Session revoked successfully",
                sessionId: deletedSession[0].id
            };
        } catch (error) {
            set.status = 500;
            return {
                error: "Failed to revoke session",
                details: error instanceof Error ? error.message : "Unknown error"
            };
        }
    })

    // Revoke all sessions except current
    .post("/sessions/revoke-all", async ({ user: currentUser, session: currentSession }) => {
        try {
            const deletedSessions = await db
                .delete(session)
                .where(
                    and(
                        eq(session.userId, currentUser.id),
                        // Don't revoke the current session
                        ne(session.id, currentSession.id)
                    )
                )
                .returning();

            return {
                message: "All other sessions revoked successfully",
                revokedCount: deletedSessions.length
            };
        } catch (error) {
            return {
                error: "Failed to revoke sessions",
                details: error instanceof Error ? error.message : "Unknown error"
            };
        }
    });
