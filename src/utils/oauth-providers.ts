import { OAuth2Client } from "google-auth-library";
import appleSigninAuth from "apple-signin-auth";

// Initialize OAuth clients
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    picture?: string;
    emailVerified: boolean;
}

export interface OAuthVerificationResult {
    success: boolean;
    profile?: UserProfile;
    error?: string;
}

/**
 * Verify Google ID token and extract user profile
 */
export async function verifyGoogleToken(idToken: string): Promise<OAuthVerificationResult> {
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) {
            return { success: false, error: "Invalid Google token payload" };
        }

        const { sub: id, email, name, picture } = payload;

        if (!email || !id || !name) {
            return { success: false, error: "Missing required Google user data" };
        }

        return {
            success: true,
            profile: {
                id,
                email,
                name,
                picture,
                emailVerified: true, // Google emails are verified
            },
        };
    } catch (error) {
        console.error("Google token verification error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Google token verification failed",
        };
    }
}

/**
 * Verify Apple ID token and extract user profile
 */
export async function verifyAppleToken(idToken: string, clientId?: string): Promise<OAuthVerificationResult> {
    try {
        const appleClientId = clientId || process.env.APPLE_CLIENT_ID;
        if (!appleClientId) {
            return { success: false, error: "Apple Client ID not configured" };
        }

        // Verify the Apple ID token
        const appleIdTokenClaims = await appleSigninAuth.verifyIdToken(idToken, {
            audience: appleClientId,
            ignoreExpiration: false,
        });

        const { sub: id, email, email_verified } = appleIdTokenClaims;

        if (!id) {
            return { success: false, error: "Missing Apple user ID" };
        }

        // Apple might not provide email if user chose to hide it
        const userEmail = email || `${id}@privaterelay.appleid.com`;
        const emailVerified = email_verified === "true" || email_verified === true;

        // Apple doesn't always provide the name in the ID token
        // The name is typically provided only on the first sign-in via the authorization code
        // For subsequent sign-ins, you would need to store it from the first interaction
        const userName = `Apple User`; // Default name, should be updated from authorization response

        return {
            success: true,
            profile: {
                id,
                email: userEmail,
                name: userName,
                emailVerified,
            },
        };
    } catch (error) {
        console.error("Apple token verification error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Apple token verification failed",
        };
    }
}

/**
 * Verify OAuth token based on provider
 */
export async function verifyOAuthToken(
    provider: string,
    idToken: string,
    clientId?: string
): Promise<OAuthVerificationResult> {
    switch (provider.toLowerCase()) {
        case "google":
            return verifyGoogleToken(idToken);
        case "apple":
            return verifyAppleToken(idToken, clientId);
        default:
            return {
                success: false,
                error: `Unsupported OAuth provider: ${provider}`,
            };
    }
}

/**
 * Get supported OAuth providers
 */
export function getSupportedProviders(): string[] {
    return ["google", "apple"];
}

/**
 * Check if provider is supported
 */
export function isProviderSupported(provider: string): boolean {
    return getSupportedProviders().includes(provider.toLowerCase());
}
