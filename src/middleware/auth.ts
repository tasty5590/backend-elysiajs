import { extractAuthToken, validateSession } from "../utils/auth";

export const authMiddleware = async ({ request, set }: { request: Request; set: Elysia.Set }) => {
    const authHeader = request.headers.get('authorization');

    // Extract and validate auth token
    const tokenResult = extractAuthToken(authHeader);
    if (!tokenResult.success) {
        set.status = 401;
        throw new Error(tokenResult.error || 'Authentication failed');
    }

    // Validate session
    const sessionResult = await validateSession(tokenResult.token!);
    if (!sessionResult.success) {
        set.status = 401;
        throw new Error(sessionResult.error || 'Invalid session');
    }

    return {
        user: sessionResult.user!,
        session: sessionResult.session!,
        isAuthenticated: true
    };
}
