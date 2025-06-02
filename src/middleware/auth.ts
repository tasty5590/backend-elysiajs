import { Elysia } from "elysia";
import { db } from "../db/client";
import { session, user } from "../db/schema";
import { eq, and, gt } from "drizzle-orm";

export const authMiddleware = new Elysia({ name: "auth" })
    .guard({
        beforeHandle: async ({ request, set }) => {
            const authHeader = request.headers.get('authorization');

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                set.status = 401;
                return { error: 'Unauthorized: Missing or invalid authorization header' };
            }

            const token = authHeader.replace('Bearer ', '');

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
                    set.status = 401;
                    return { error: 'Unauthorized: Invalid or expired session' };
                }

                // Store in context for use in routes
                (request as any).user = sessionData[0].user;
                (request as any).session = sessionData[0].session;

            } catch (error) {
                set.status = 401;
                return { error: 'Unauthorized: Session verification failed', details: error instanceof Error ? error.message : 'Unknown error' };
            }
        }
    })
    .derive(({ request }) => ({
        user: (request as any).user,
        session: (request as any).session,
        isAuthenticated: !!(request as any).user
    }));
