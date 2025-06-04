import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { user, session, account } from "../db/schema/auth";
import { generateSessionToken, generateId, extractAuthToken } from "../utils/auth";
import { verifyOAuthToken, isProviderSupported, getSupportedProviders } from "../utils/oauth-providers";

export const authRoutes = new Elysia({ prefix: "/auth" })
    .post("/:provider", async ({ body, set, request, params }) => {
        try {
            const { idToken, user: userInfo } = body;
            const provider = params.provider?.toLowerCase();

            // Validate provider
            if (!provider || !isProviderSupported(provider)) {
                set.status = 400;
                return {
                    error: "Invalid or unsupported provider",
                    supportedProviders: getSupportedProviders()
                };
            }

            // Verify the OAuth token
            const verificationResult = await verifyOAuthToken(provider, idToken);

            if (!verificationResult.success || !verificationResult.profile) {
                set.status = 400;
                return { error: verificationResult.error || "Token verification failed" };
            }

            const profile = verificationResult.profile;

            // For Apple, we might receive additional user info on first sign-in
            let finalName = profile.name;
            let finalEmail = profile.email;

            if (provider === "apple" && userInfo) {
                // Apple sends user info separately on first authorization
                if (userInfo.name && userInfo.name.firstName) {
                    finalName = `${userInfo.name.firstName} ${userInfo.name.lastName || ''}`.trim();
                }
                if (userInfo.email) {
                    finalEmail = userInfo.email;
                }
            }

            // Check if user already exists
            const existingUsers = await db
                .select()
                .from(user)
                .where(eq(user.email, finalEmail))
                .limit(1);

            let currentUser;

            if (existingUsers.length === 0) {
                // Create new user
                const newUsers = await db
                    .insert(user)
                    .values({
                        id: generateId("user"),
                        email: finalEmail,
                        name: finalName,
                        image: profile.picture || null,
                        emailVerified: profile.emailVerified,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .returning();

                currentUser = newUsers[0];

                // Create account record for the OAuth provider
                await db
                    .insert(account)
                    .values({
                        id: generateId("account"),
                        userId: currentUser.id,
                        accountId: profile.id,
                        providerId: provider,
                        accessToken: null,
                        refreshToken: null,
                        idToken: null,
                        accessTokenExpiresAt: null,
                        refreshTokenExpiresAt: null,
                        scope: null,
                        password: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
            } else {
                currentUser = existingUsers[0];

                // Update user info from OAuth provider (in case name/picture changed)
                const updatedUsers = await db
                    .update(user)
                    .set({
                        name: finalName,
                        image: profile.picture || currentUser.image,
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
                message: `Successfully signed in with ${provider}`,
                provider,
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
            console.error(`OAuth Sign In error (${params.provider}):`, error);
            set.status = 400;
            return {
                error: error instanceof Error ? error.message : "OAuth Sign In failed"
            };
        }
    }, {
        body: t.Object({
            idToken: t.String({ minLength: 1 }),
            user: t.Optional(t.Object({
                name: t.Optional(t.Object({
                    firstName: t.Optional(t.String()),
                    lastName: t.Optional(t.String()),
                })),
                email: t.Optional(t.String()),
            }))
        }),
        params: t.Object({
            provider: t.String({ minLength: 1 }),
        })
    })

    .post("/sign-out", async ({ headers, set }) => {
        try {
            const authHeader = headers.authorization;

            // Extract and validate auth token
            const tokenResult = extractAuthToken(authHeader);
            if (!tokenResult.success || !tokenResult.token) {
                set.status = 401;
                return { error: tokenResult.error || "Missing authorization header" };
            }

            // Delete the session from database
            const deletedSessions = await db
                .delete(session)
                .where(eq(session.token, tokenResult.token))
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
    });
