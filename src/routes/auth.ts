import { Elysia, t } from "elysia";
import { auth } from "../auth";

export const authRoutes = new Elysia({ prefix: "/auth" })
    // Register new user
    .post("/sign-up", async ({ body, set }) => {
        try {
            const request = new Request('http://localhost:3000/api/auth/sign-up/email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: body.email,
                    password: body.password,
                    name: body.name,
                })
            });

            const response = await auth.handler(request);
            const result = await response.json();

            if (!response.ok) {
                set.status = 400;
                return { error: result.error || "Failed to create account" };
            }

            return {
                message: "Account created successfully",
                user: result.user
            };
        } catch (error) {
            set.status = 400;
            return {
                error: error instanceof Error ? error.message : "Registration failed"
            };
        }
    }, {
        body: t.Object({
            email: t.String({ format: "email" }),
            password: t.String({ minLength: 6 }),
            name: t.String({ minLength: 1 }),
        })
    })

    // Sign in user
    .post("/sign-in", async ({ body, set }) => {
        try {
            const request = new Request('http://localhost:3000/api/auth/sign-in/email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: body.email,
                    password: body.password,
                })
            });

            const response = await auth.handler(request);
            const result = await response.json();

            if (!response.ok) {
                set.status = 401;
                return { error: result.error || "Invalid credentials" };
            }

            return {
                message: "Signed in successfully",
                user: result.user,
                token: result.token
            };
        } catch (error) {
            set.status = 401;
            return {
                error: error instanceof Error ? error.message : "Sign in failed"
            };
        }
    }, {
        body: t.Object({
            email: t.String({ format: "email" }),
            password: t.String(),
        })
    })

    // Sign out user
    .post("/sign-out", async ({ headers, set }) => {
        try {
            const authHeader = headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                set.status = 401;
                return { error: "Missing authorization header" };
            }

            const token = authHeader.replace('Bearer ', '');

            // Import db and session schema
            const { db } = await import("../db/client");
            const { session } = await import("../db/schema");
            const { eq } = await import("drizzle-orm");

            // Delete the session directly from database
            const deletedSession = await db
                .delete(session)
                .where(eq(session.token, token))
                .returning();

            if (!deletedSession.length) {
                set.status = 404;
                return { error: "Session not found" };
            }

            return {
                message: "Signed out successfully",
                sessionId: deletedSession[0].id
            };
        } catch (error) {
            set.status = 400;
            return {
                error: error instanceof Error ? error.message : "Sign out failed"
            };
        }
    })

    // Get current user
    .get("/me", async ({ headers, set }) => {
        try {
            const authHeader = headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                set.status = 401;
                return { error: "Missing authorization header" };
            }

            const token = authHeader.replace('Bearer ', '');

            // Import db and session schema  
            const { db } = await import("../db/client");
            const { session, user } = await import("../db/schema");
            const { eq, and, gt } = await import("drizzle-orm");

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
                return { error: "Invalid or expired session" };
            }

            return {
                user: sessionData[0].user,
                session: sessionData[0].session
            };
        } catch (error) {
            set.status = 401;
            return {
                error: error instanceof Error ? error.message : "Failed to get user"
            };
        }
    });
