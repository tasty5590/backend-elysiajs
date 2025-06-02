import { Elysia, t } from "elysia";
import { OAuth2Client } from "google-auth-library";
import { db } from "../db/client";
import { user, session, account } from "../db/schema/auth";
import { eq, and, gt } from "drizzle-orm";
import { generateSessionToken, generateId } from "../utils/auth";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const authRoutes = new Elysia({ prefix: "/auth" })
    // Google Sign In - handles both sign up and sign in
    .post("/google", async ({ body, set, request }) => {
        try {
            const { idToken } = body;

            // Verify the Google ID token
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();
            if (!payload) {
                set.status = 400;
                return { error: "Invalid Google token" };
            }

            const googleUserId = payload.sub;
            const email = payload.email;
            const name = payload.name;
            const picture = payload.picture;

            if (!email || !googleUserId || !name) {
                set.status = 400;
                return { error: "Missing required Google user data" };
            }

            // Check if user already exists
            const existingUsers = await db
                .select()
                .from(user)
                .where(eq(user.email, email))
                .limit(1);

            let currentUser;

            if (existingUsers.length === 0) {
                // Create new user
                const newUsers = await db
                    .insert(user)
                    .values({
                        id: generateId("user"),
                        email,
                        name,
                        image: picture,
                        emailVerified: true, // Google emails are verified
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .returning();

                currentUser = newUsers[0];

                // Create account record for Google
                await db
                    .insert(account)
                    .values({
                        id: generateId("account"),
                        userId: currentUser.id,
                        accountId: googleUserId,
                        providerId: "google",
                        accessToken: null,
                        refreshToken: null,
                        idToken: null,
                        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
            } else {
                currentUser = existingUsers[0];

                // Update user info from Google (in case name/picture changed)
                const updatedUsers = await db
                    .update(user)
                    .set({
                        name,
                        image: picture,
                        updatedAt: new Date(),
                    })
                    .where(eq(user.id, currentUser.id))
                    .returning();

                currentUser = updatedUsers[0];
            }

            // Clean up any existing sessions for this user (optional, for single-session policy)
            await db
                .delete(session)
                .where(eq(session.userId, currentUser.id));

            // Create new session
            const sessionToken = generateSessionToken();
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

            const userAgent = request.headers.get("user-agent") || "";
            const ipAddress = request.headers.get("x-forwarded-for") ||
                request.headers.get("x-real-ip") ||
                "unknown";

            const newSessions = await db
                .insert(session)
                .values({
                    id: generateId("session"),
                    token: sessionToken,
                    userId: currentUser.id,
                    expiresAt,
                    ipAddress,
                    userAgent,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                .returning();

            return {
                message: "Successfully signed in with Google",
                user: {
                    id: currentUser.id,
                    email: currentUser.email,
                    name: currentUser.name,
                    image: currentUser.image,
                    emailVerified: currentUser.emailVerified,
                    createdAt: currentUser.createdAt,
                    updatedAt: currentUser.updatedAt,
                },
                token: sessionToken,
                session: {
                    id: newSessions[0].id,
                    expiresAt: newSessions[0].expiresAt,
                },
            };
        } catch (error) {
            console.error("Google Sign In error:", error);
            set.status = 400;
            return {
                error: error instanceof Error ? error.message : "Google Sign In failed"
            };
        }
    }, {
        body: t.Object({
            idToken: t.String({ minLength: 1 }),
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

            // Delete the session from database
            const deletedSessions = await db
                .delete(session)
                .where(eq(session.token, token))
                .returning();

            if (!deletedSessions.length) {
                set.status = 404;
                return { error: "Session not found" };
            }

            return {
                message: "Signed out successfully",
                sessionId: deletedSessions[0].id
            };
        } catch (error) {
            console.error("Sign out error:", error);
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

            // Query the session and user data
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
            console.error("Get user error:", error);
            set.status = 401;
            return {
                error: error instanceof Error ? error.message : "Failed to get user"
            };
        }
    });
